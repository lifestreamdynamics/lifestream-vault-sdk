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

import { LifestreamVaultClient, DEFAULT_API_URL } from './client.js';

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

  it('should use default production URL when baseUrl is not provided', () => {
    const client = new LifestreamVaultClient({ apiKey: 'lsv_k_testkey' });
    expect(client.baseUrl).toBe(DEFAULT_API_URL);
  });

  it('should use default production URL when baseUrl is empty string', () => {
    const client = new LifestreamVaultClient({ baseUrl: '', apiKey: 'lsv_k_testkey' });
    expect(client.baseUrl).toBe(DEFAULT_API_URL);
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

  it('should have mfa resource', () => {
    const client = new LifestreamVaultClient({
      baseUrl: 'http://localhost:4660',
      apiKey: 'lsv_k_testkey',
    });

    expect(client.mfa).toBeDefined();
    expect(client.mfa.getStatus).toBeInstanceOf(Function);
    expect(client.mfa.setupTotp).toBeInstanceOf(Function);
    expect(client.mfa.verifyTotp).toBeInstanceOf(Function);
  });
});

describe('LifestreamVaultClient.login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should login without MFA when MFA is not required', async () => {
    const ky = await import('ky');
    const mockPost = vi.fn();
    const mockCreate = vi.fn().mockReturnValue({ post: mockPost });

    vi.mocked(ky.default.create).mockImplementation(mockCreate as any);

    const mockResponse = {
      json: vi.fn().mockResolvedValue({
        user: { id: 'u1', email: 'user@example.com', displayName: 'Test User' },
        accessToken: 'jwt-access-token',
      }),
      headers: new Headers({ 'set-cookie': 'lsv_refresh=refresh-token; HttpOnly' }),
    };

    mockPost.mockResolvedValue(mockResponse);

    const result = await LifestreamVaultClient.login(
      'http://localhost:4660',
      'user@example.com',
      'password123',
    );

    expect(mockPost).toHaveBeenCalledWith('auth/login', {
      json: { email: 'user@example.com', password: 'password123' },
    });
    expect(result.client).toBeInstanceOf(LifestreamVaultClient);
    expect(result.tokens.accessToken).toBe('jwt-access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });

  it('should login with MFA when mfaCode is provided', async () => {
    const ky = await import('ky');
    const mockPost = vi.fn();
    const mockCreate = vi.fn().mockReturnValue({ post: mockPost });

    vi.mocked(ky.default.create).mockImplementation(mockCreate as any);

    // First call: login returns MFA challenge
    const mfaChallengeResponse = {
      json: vi.fn().mockResolvedValue({
        mfaRequired: true,
        mfaToken: 'mfa-token-123',
        mfaMethods: ['totp', 'backup_code'],
        user: { email: 'user@example.com', displayName: 'Test User' },
      }),
      headers: new Headers(),
    };

    // Second call: MFA verification returns tokens
    const mfaSuccessResponse = {
      json: vi.fn().mockResolvedValue({
        user: { id: 'u1', email: 'user@example.com', displayName: 'Test User' },
        accessToken: 'jwt-access-token-after-mfa',
      }),
      headers: new Headers({ 'set-cookie': 'lsv_refresh=refresh-token-mfa; HttpOnly' }),
    };

    mockPost.mockResolvedValueOnce(mfaChallengeResponse).mockResolvedValueOnce(mfaSuccessResponse);

    const result = await LifestreamVaultClient.login(
      'http://localhost:4660',
      'user@example.com',
      'password123',
      {},
      { mfaCode: '123456' },
    );

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost).toHaveBeenNthCalledWith(1, 'auth/login', {
      json: { email: 'user@example.com', password: 'password123' },
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, 'auth/mfa/totp', {
      json: { mfaToken: 'mfa-token-123', code: '123456' },
    });
    expect(result.client).toBeInstanceOf(LifestreamVaultClient);
    expect(result.tokens.accessToken).toBe('jwt-access-token-after-mfa');
    expect(result.refreshToken).toBe('refresh-token-mfa');
  });

  it('should login with MFA using onMfaRequired callback', async () => {
    const ky = await import('ky');
    const mockPost = vi.fn();
    const mockCreate = vi.fn().mockReturnValue({ post: mockPost });

    vi.mocked(ky.default.create).mockImplementation(mockCreate as any);

    const mfaChallengeResponse = {
      json: vi.fn().mockResolvedValue({
        mfaRequired: true,
        mfaToken: 'mfa-token-456',
        mfaMethods: ['totp', 'backup_code'],
        user: { email: 'user@example.com', displayName: 'Test User' },
      }),
      headers: new Headers(),
    };

    const mfaSuccessResponse = {
      json: vi.fn().mockResolvedValue({
        user: { id: 'u1', email: 'user@example.com', displayName: 'Test User' },
        accessToken: 'jwt-access-token-callback',
      }),
      headers: new Headers({ 'set-cookie': 'lsv_refresh=refresh-token-callback; HttpOnly' }),
    };

    mockPost.mockResolvedValueOnce(mfaChallengeResponse).mockResolvedValueOnce(mfaSuccessResponse);

    const onMfaRequiredMock = vi.fn().mockResolvedValue({ method: 'backup_code', code: 'AAAA-BBBB-CCCC-DDDD' });

    const result = await LifestreamVaultClient.login(
      'http://localhost:4660',
      'user@example.com',
      'password123',
      {},
      { onMfaRequired: onMfaRequiredMock },
    );

    expect(onMfaRequiredMock).toHaveBeenCalledWith({
      methods: ['totp', 'backup_code'],
      mfaToken: 'mfa-token-456',
    });
    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost).toHaveBeenNthCalledWith(2, 'auth/mfa/backup-code', {
      json: { mfaToken: 'mfa-token-456', code: 'AAAA-BBBB-CCCC-DDDD' },
    });
    expect(result.client).toBeInstanceOf(LifestreamVaultClient);
    expect(result.tokens.accessToken).toBe('jwt-access-token-callback');
  });

  it('should throw ValidationError when MFA required but no options provided', async () => {
    const ky = await import('ky');
    const mockPost = vi.fn();
    const mockCreate = vi.fn().mockReturnValue({ post: mockPost });

    vi.mocked(ky.default.create).mockImplementation(mockCreate as any);

    const mfaChallengeResponse = {
      json: vi.fn().mockResolvedValue({
        mfaRequired: true,
        mfaToken: 'mfa-token-789',
        mfaMethods: ['totp'],
        user: { email: 'user@example.com', displayName: 'Test User' },
      }),
      headers: new Headers(),
    };

    mockPost.mockResolvedValue(mfaChallengeResponse);

    await expect(
      LifestreamVaultClient.login('http://localhost:4660', 'user@example.com', 'password123'),
    ).rejects.toThrow(/MFA is required but no MFA code or callback provided/);
  });
});
