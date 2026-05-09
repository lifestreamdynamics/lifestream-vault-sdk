/**
 * Audit logging subpath. Node-only — uses `node:fs`/`path`/`os`. Cannot be
 * imported from React Native or browser bundles.
 *
 * Use this from server-side scripts, the CLI, or any Node consumer that wants
 * to record every SDK request to a rotating log file. Two ways:
 *
 *   1. Construct an `AuditLogger` directly to read or write log entries.
 *   2. Call `installAuditLogging(client)` after constructing your
 *      `LifestreamVaultClient` to install before/after hooks that record
 *      every request.
 */

import type { LifestreamVaultClient } from './client.js';
import { AuditLogger, type AuditLoggerOptions } from './lib/audit-logger.js';

export { AuditLogger };
export type { AuditEntry, AuditLoggerOptions } from './lib/audit-logger.js';

/**
 * Install audit-logging hooks on a `LifestreamVaultClient`. Records every
 * request's method, path, status, and duration to a rotating log file.
 *
 * Best-effort: log write failures never break in-flight requests.
 *
 * Returns the underlying `AuditLogger` so callers can later read or rotate.
 *
 * @example
 * ```ts
 * import { LifestreamVaultClient } from '@lifestreamdynamics/vault-sdk';
 * import { installAuditLogging } from '@lifestreamdynamics/vault-sdk/audit';
 *
 * const client = new LifestreamVaultClient({ accessToken: '...' });
 * const logger = installAuditLogging(client, { logPath: '/var/log/lsv.log' });
 * ```
 */
export function installAuditLogging(
  client: LifestreamVaultClient,
  options: AuditLoggerOptions = {},
): AuditLogger {
  const logger = new AuditLogger(options);
  const requestTimings = new WeakMap<Request, number>();

  // ky exposes its hook arrays via the readonly `defaults` map. We append to
  // the existing arrays in-place — ky reads them on every request.
  const httpClient = client.http;
  // The hooks property exists on ky instances; cast through unknown to avoid
  // exposing ky's internal types here.
  const hooks = (httpClient as unknown as {
    defaults: { options: { hooks: { beforeRequest: Array<unknown>; afterResponse: Array<unknown> } } };
  }).defaults.options.hooks;

  hooks.beforeRequest.push((request: Request) => {
    requestTimings.set(request, Date.now());
  });

  hooks.afterResponse.push(async (request: Request, _opts: unknown, response: Response) => {
    const startTime = requestTimings.get(request);
    const durationMs = startTime ? Date.now() - startTime : 0;
    try {
      const url = new URL(request.url);
      await logger.log({
        timestamp: new Date().toISOString(),
        method: request.method,
        path: url.pathname,
        status: response.status,
        durationMs,
      });
    } catch {
      // Best-effort — never break a real request because the audit write failed.
    }
  });

  return logger;
}
