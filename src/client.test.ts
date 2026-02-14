import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ky before importing client
vi.mock('ky', () => {
  const createMock = vi.fn();
  const mock = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    create: createMock,
  };
  createMock.mockReturnValue(mock);
  return { default: mock };
});

import { LifestreamVaultClient } from './client.js';

describe('LifestreamVaultClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a client with apiKey', () => {
    const client = new LifestreamVaultClient({
      baseUrl: 'http://localhost:4660',
      apiKey: 'lsv_k_testkey',
    });

    expect(client.baseUrl).toBe('http://localhost:4660');
    expect(client.http).toBeDefined();
    expect(client.vaults).toBeDefined();
    expect(client.documents).toBeDefined();
    expect(client.search).toBeDefined();
    expect(client.ai).toBeDefined();
  });

  it('should create a client with accessToken', () => {
    const client = new LifestreamVaultClient({
      baseUrl: 'http://localhost:4660',
      accessToken: 'jwt-token-here',
    });

    expect(client.baseUrl).toBe('http://localhost:4660');
    expect(client.http).toBeDefined();
  });

  it('should strip trailing slash from baseUrl', () => {
    const client = new LifestreamVaultClient({
      baseUrl: 'http://localhost:4660/',
      apiKey: 'lsv_k_testkey',
    });

    expect(client.baseUrl).toBe('http://localhost:4660');
  });

  it('should throw if baseUrl is empty', () => {
    expect(
      () => new LifestreamVaultClient({ baseUrl: '', apiKey: 'lsv_k_testkey' }),
    ).toThrow('baseUrl is required');
  });

  it('should throw if neither apiKey nor accessToken is provided', () => {
    expect(
      () => new LifestreamVaultClient({ baseUrl: 'http://localhost:4660' }),
    ).toThrow('Either apiKey or accessToken is required');
  });

  it('should configure ky with correct prefixUrl and timeout', async () => {
    const ky = await import('ky');

    new LifestreamVaultClient({
      baseUrl: 'http://localhost:4660',
      apiKey: 'lsv_k_testkey',
      timeout: 60_000,
    });

    expect(ky.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        prefixUrl: 'http://localhost:4660/api/v1',
        timeout: 60_000,
        headers: {
          Authorization: 'Bearer lsv_k_testkey',
        },
      }),
    );
  });

  it('should use default timeout of 30s when not specified', async () => {
    const ky = await import('ky');

    new LifestreamVaultClient({
      baseUrl: 'http://localhost:4660',
      apiKey: 'lsv_k_testkey',
    });

    expect(ky.default.create).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 30_000 }),
    );
  });

  it('should include signing hooks when using apiKey', async () => {
    const ky = await import('ky');

    new LifestreamVaultClient({
      baseUrl: 'http://localhost:4660',
      apiKey: 'lsv_k_testkey',
    });

    expect(ky.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        hooks: expect.objectContaining({
          beforeRequest: expect.arrayContaining([expect.any(Function)]),
        }),
      }),
    );
  });

  it('should include token management hooks when using accessToken', async () => {
    const ky = await import('ky');

    const client = new LifestreamVaultClient({
      baseUrl: 'http://localhost:4660',
      accessToken: 'jwt-token-here',
    });

    // JWT clients have beforeRequest hooks (for dynamic auth header)
    // ky.create is called twice: once for baseHttp (no hooks), once for main client
    const calls = vi.mocked(ky.default.create).mock.calls;
    const mainCall = calls[calls.length - 1][0] as any;
    expect(mainCall.hooks).toBeDefined();
    expect(mainCall.hooks.beforeRequest).toHaveLength(1);
    expect(mainCall.hooks.afterResponse).toHaveLength(1);

    // tokenManager should be set
    expect(client.tokenManager).not.toBeNull();
  });

  it('should set tokenManager to null when using apiKey', () => {
    const client = new LifestreamVaultClient({
      baseUrl: 'http://localhost:4660',
      apiKey: 'lsv_k_testkey',
    });

    expect(client.tokenManager).toBeNull();
  });

  it('should allow disabling signing via enableRequestSigning: false', async () => {
    const ky = await import('ky');

    new LifestreamVaultClient({
      baseUrl: 'http://localhost:4660',
      apiKey: 'lsv_k_testkey',
      enableRequestSigning: false,
    });

    // No signing hooks, but still has hooks object (with empty arrays)
    const call = vi.mocked(ky.default.create).mock.calls[0][0] as any;
    expect(call.hooks.beforeRequest).toHaveLength(0);
  });

  it('should prefer apiKey over accessToken when both provided', async () => {
    const ky = await import('ky');

    new LifestreamVaultClient({
      baseUrl: 'http://localhost:4660',
      apiKey: 'lsv_k_testkey',
      accessToken: 'jwt-token',
    });

    expect(ky.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { Authorization: 'Bearer lsv_k_testkey' },
      }),
    );
  });
});
