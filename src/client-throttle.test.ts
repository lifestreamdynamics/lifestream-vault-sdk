/**
 * Transparent throttle-handling tests for LifestreamVaultClient.
 *
 * These tests exercise real ky retry behaviour (no ky mock) by standing up a
 * minimal local HTTP server with `node:http`.  Each test controls how many 429
 * responses the server emits before returning 200, which lets us verify:
 *
 *  - A 429+Retry-After eventually resolves without throwing.
 *  - Retry exhaustion still propagates an error to the caller.
 *  - Caller `retry: { limit: 0 }` disables all retries.
 *  - The `retry` event on the SDKEventEmitter fires once per retry attempt.
 *  - The status code on the RetryEvent matches the 429 from the server.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as http from 'node:http';
import { LifestreamVaultClient } from './client.js';
import { SDKEventEmitter } from './lib/event-emitter.js';

// ---------------------------------------------------------------------------
// Minimal test-server helpers
// ---------------------------------------------------------------------------

interface ServerHandle {
  server: http.Server;
  port: number;
  baseUrl: string;
}

interface RequestRecord {
  method: string;
  path: string;
  attempt: number;
}

/**
 * Start a local HTTP server that returns HTTP 429 for the first
 * `failCount` GET /vaults requests, then returns 200 with `successBody`.
 *
 * The server records each incoming request in the `requests` array so tests
 * can assert on attempt counts.
 *
 * The `Retry-After: 0` header is included on 429 responses so ky retries
 * immediately without introducing real wall-clock delays.
 */
async function startThrottleServer(
  failCount: number,
  successBody: unknown = { vaults: [] },
  requests: RequestRecord[] = [],
): Promise<ServerHandle> {
  let attempt = 0;

  const server = http.createServer((_req, res) => {
    attempt += 1;
    requests.push({ method: _req.method!, path: _req.url!, attempt });

    if (attempt <= failCount) {
      // Return 429 with a Retry-After of 0 seconds so ky retries instantly
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': '0',
      });
      res.end(JSON.stringify({ error: 'Too Many Requests' }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(successBody));
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  const address = server.address() as { port: number };
  const port = address.port;

  return { server, port, baseUrl: `http://127.0.0.1:${port}` };
}

async function stopServer(handle: ServerHandle): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    handle.server.close((err) => (err ? reject(err) : resolve())),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Transparent throttle handling (HTTP level)', () => {
  let handle: ServerHandle;

  afterEach(async () => {
    if (handle) await stopServer(handle);
  });

  it('resolves successfully after a single 429+Retry-After then 200', async () => {
    const requests: RequestRecord[] = [];
    handle = await startThrottleServer(1, { vaults: [{ id: 'v1', name: 'Test' }] }, requests);

    // limit:3 (default) — server returns 429 once then 200
    const client = new LifestreamVaultClient({
      baseUrl: handle.baseUrl,
      apiKey: 'lsv_k_testkey',
    });

    // vaults.list() issues GET /api/v1/vaults — GETs are in the default retry methods
    const result = await client.vaults.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    // Server was hit twice: once for 429, once for 200
    expect(requests).toHaveLength(2);
  });

  it('resolves after multiple 429s within retry limit', async () => {
    const requests: RequestRecord[] = [];
    handle = await startThrottleServer(2, { vaults: [{ id: 'v2', name: 'Test' }] }, requests);

    const client = new LifestreamVaultClient({
      baseUrl: handle.baseUrl,
      apiKey: 'lsv_k_testkey',
      retry: { limit: 3 },
    });

    const result = await client.vaults.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    // 2 failures + 1 success = 3 total hits
    expect(requests).toHaveLength(3);
  });

  it('throws after exhausting retries (all 429)', async () => {
    // Server always returns 429 — retry limit (2) will be exhausted
    handle = await startThrottleServer(999, { vaults: [] });

    const client = new LifestreamVaultClient({
      baseUrl: handle.baseUrl,
      apiKey: 'lsv_k_testkey',
      retry: { limit: 2, backoffLimit: 100 },
    });

    await expect(client.vaults.list()).rejects.toThrow();
  });

  it('throws immediately when retry: { limit: 0 } disables retry', async () => {
    const requests: RequestRecord[] = [];
    // Server returns 429 for the first request
    handle = await startThrottleServer(1, { vaults: [] }, requests);

    const client = new LifestreamVaultClient({
      baseUrl: handle.baseUrl,
      apiKey: 'lsv_k_testkey',
      retry: { limit: 0 },
    });

    await expect(client.vaults.list()).rejects.toThrow();
    // Only one request made — no retry
    expect(requests).toHaveLength(1);
  });

  it('emits retry event on each retry attempt', async () => {
    const requests: RequestRecord[] = [];
    // 2 failures → 2 retry events expected
    handle = await startThrottleServer(2, { vaults: [] }, requests);

    const emitter = new SDKEventEmitter();
    const retryEvents: Array<{ retryCount: number; status: number | undefined }> = [];
    emitter.on('retry', ({ retryCount, status }) => {
      retryEvents.push({ retryCount, status });
    });

    const client = new LifestreamVaultClient({
      baseUrl: handle.baseUrl,
      apiKey: 'lsv_k_testkey',
      retry: { limit: 3 },
      events: emitter,
    });

    await client.vaults.list();

    expect(retryEvents).toHaveLength(2);
    // retryCount is 1-based
    expect(retryEvents[0].retryCount).toBe(1);
    expect(retryEvents[1].retryCount).toBe(2);
    // status on each event should be 429
    expect(retryEvents[0].status).toBe(429);
    expect(retryEvents[1].status).toBe(429);
  });

  it('does not emit retry event when request succeeds on first attempt', async () => {
    // 0 failures — success immediately
    handle = await startThrottleServer(0, { vaults: [] });

    const emitter = new SDKEventEmitter();
    const retryListener = vi.fn();
    emitter.on('retry', retryListener);

    const client = new LifestreamVaultClient({
      baseUrl: handle.baseUrl,
      apiKey: 'lsv_k_testkey',
      events: emitter,
    });

    await client.vaults.list();

    expect(retryListener).not.toHaveBeenCalled();
  });

  it('emits afterResponse event with 200 status after successful retry', async () => {
    handle = await startThrottleServer(1, { vaults: [] });

    const emitter = new SDKEventEmitter();
    const afterResponseStatuses: number[] = [];
    emitter.on('afterResponse', ({ status }) => {
      afterResponseStatuses.push(status);
    });

    const client = new LifestreamVaultClient({
      baseUrl: handle.baseUrl,
      apiKey: 'lsv_k_testkey',
      events: emitter,
    });

    await client.vaults.list();

    // afterResponse fires for every response including the failed 429
    expect(afterResponseStatuses).toContain(200);
  });

  it('respects Retry-After header (retry happens, timing is short/zero for Retry-After:0)', async () => {
    const requests: RequestRecord[] = [];
    handle = await startThrottleServer(1, { data: [{ id: 'v3' }] }, requests);

    const client = new LifestreamVaultClient({
      baseUrl: handle.baseUrl,
      apiKey: 'lsv_k_testkey',
    });

    const start = Date.now();
    await client.vaults.list();
    const elapsed = Date.now() - start;

    // With Retry-After: 0 the retry should happen quickly (< 2 s with any overhead)
    expect(elapsed).toBeLessThan(2000);
    // And the server was called twice (original + retry)
    expect(requests).toHaveLength(2);
  });
});
