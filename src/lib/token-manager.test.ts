import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  decodeJwtPayload,
  isTokenExpired,
  TokenManager,
  type AuthTokens,
} from './token-manager.js';

/**
 * Create a fake JWT with the given payload.
 * Structure: header.payload.signature (all base64url-encoded).
 */
function createFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = Buffer.from('fake-signature').toString('base64url');
  return `${header}.${body}.${signature}`;
}

describe('decodeJwtPayload', () => {
  it('should decode a valid JWT payload', () => {
    const token = createFakeJwt({ sub: 'user-1', exp: 1700000000 });
    const payload = decodeJwtPayload(token);

    expect(payload).toEqual({ sub: 'user-1', exp: 1700000000 });
  });

  it('should return null for invalid token format', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('')).toBeNull();
    expect(decodeJwtPayload('a.b')).toBeNull();
  });

  it('should return null for invalid base64', () => {
    expect(decodeJwtPayload('a.!!!.c')).toBeNull();
  });

  it('should handle tokens with extra fields', () => {
    const token = createFakeJwt({ sub: 'user-1', exp: 1700000000, email: 'test@example.com', role: 'admin' });
    const payload = decodeJwtPayload(token);

    expect(payload?.sub).toBe('user-1');
    expect(payload?.email).toBe('test@example.com');
    expect(payload?.role).toBe('admin');
  });
});

describe('isTokenExpired', () => {
  it('should return true for expired token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const token = createFakeJwt({ exp: pastExp });

    expect(isTokenExpired(token)).toBe(true);
  });

  it('should return false for token not yet near expiry', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
    const token = createFakeJwt({ exp: futureExp });

    expect(isTokenExpired(token, 60_000)).toBe(false);
  });

  it('should return true when token is within buffer window', () => {
    const soonExp = Math.floor(Date.now() / 1000) + 30; // 30 seconds from now
    const token = createFakeJwt({ exp: soonExp });

    // With 60s buffer, this should be considered expired
    expect(isTokenExpired(token, 60_000)).toBe(true);
  });

  it('should return true for token with no exp claim', () => {
    const token = createFakeJwt({ sub: 'user-1' });
    expect(isTokenExpired(token)).toBe(true);
  });

  it('should return true for invalid token', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true);
  });

  it('should use default 60s buffer', () => {
    const exp = Math.floor(Date.now() / 1000) + 59; // 59 seconds from now
    const token = createFakeJwt({ exp });

    // Default buffer is 60s, so 59s left means expired
    expect(isTokenExpired(token)).toBe(true);
  });
});

describe('TokenManager', () => {
  let manager: TokenManager;
  const initialToken = createFakeJwt({ exp: Math.floor(Date.now() / 1000) + 900 }); // 15 min
  const refreshToken = 'test-refresh-token';

  beforeEach(() => {
    manager = new TokenManager(initialToken, refreshToken);
  });

  describe('getAccessToken / setAccessToken', () => {
    it('should return the current access token', () => {
      expect(manager.getAccessToken()).toBe(initialToken);
    });

    it('should update the access token', () => {
      const newToken = createFakeJwt({ exp: Math.floor(Date.now() / 1000) + 1800 });
      manager.setAccessToken(newToken);
      expect(manager.getAccessToken()).toBe(newToken);
    });
  });

  describe('getRefreshToken / setRefreshToken', () => {
    it('should return the current refresh token', () => {
      expect(manager.getRefreshToken()).toBe(refreshToken);
    });

    it('should update the refresh token', () => {
      manager.setRefreshToken('new-refresh');
      expect(manager.getRefreshToken()).toBe('new-refresh');
    });

    it('should allow setting refresh token to null', () => {
      manager.setRefreshToken(null);
      expect(manager.getRefreshToken()).toBeNull();
    });
  });

  describe('needsRefresh', () => {
    it('should return false when token has plenty of time', () => {
      expect(manager.needsRefresh()).toBe(false);
    });

    it('should return true when token is near expiry', () => {
      const nearExpiry = createFakeJwt({ exp: Math.floor(Date.now() / 1000) + 30 });
      const mgr = new TokenManager(nearExpiry, refreshToken);
      expect(mgr.needsRefresh()).toBe(true);
    });

    it('should respect custom buffer', () => {
      const exp = Math.floor(Date.now() / 1000) + 120; // 2 minutes
      const token = createFakeJwt({ exp });
      const mgr = new TokenManager(token, refreshToken, { refreshBufferMs: 180_000 }); // 3 min buffer
      expect(mgr.needsRefresh()).toBe(true);
    });
  });

  describe('refresh', () => {
    it('should throw if no refresh token is available', async () => {
      const mgr = new TokenManager(initialToken, null);
      const mockHttp = {} as any;

      await expect(mgr.refresh(mockHttp)).rejects.toThrow('No refresh token available');
    });

    it('should call the refresh endpoint and update tokens', async () => {
      const newAccessToken = createFakeJwt({ exp: Math.floor(Date.now() / 1000) + 900 });
      const responseTokens: AuthTokens = {
        accessToken: newAccessToken,
        user: { id: 'u1', email: 'test@example.com', role: 'user' },
      };

      const mockJsonFn = vi.fn().mockResolvedValue(responseTokens);
      const mockPost = vi.fn().mockReturnValue({ json: mockJsonFn });
      const mockHttp = { post: mockPost } as any;

      const result = await manager.refresh(mockHttp);

      expect(result).toBe(newAccessToken);
      expect(manager.getAccessToken()).toBe(newAccessToken);
      expect(mockPost).toHaveBeenCalledWith('auth/refresh', {
        headers: {
          'X-Requested-With': 'LifestreamVaultSDK',
          'Cookie': `lsv_refresh=${refreshToken}`,
        },
      });
    });

    it('should invoke onTokenRefresh callback', async () => {
      const onRefresh = vi.fn();
      const mgr = new TokenManager(initialToken, refreshToken, { onTokenRefresh: onRefresh });

      const newAccessToken = createFakeJwt({ exp: Math.floor(Date.now() / 1000) + 900 });
      const responseTokens: AuthTokens = {
        accessToken: newAccessToken,
        user: { id: 'u1', email: 'test@example.com', role: 'user' },
      };

      const mockHttp = {
        post: vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue(responseTokens) }),
      } as any;

      await mgr.refresh(mockHttp);

      expect(onRefresh).toHaveBeenCalledWith(responseTokens);
    });

    it('should deduplicate concurrent refresh requests', async () => {
      const newAccessToken = createFakeJwt({ exp: Math.floor(Date.now() / 1000) + 900 });
      const responseTokens: AuthTokens = {
        accessToken: newAccessToken,
        user: { id: 'u1', email: 'test@example.com', role: 'user' },
      };

      let resolveRefresh: (value: AuthTokens) => void;
      const refreshPromise = new Promise<AuthTokens>((resolve) => {
        resolveRefresh = resolve;
      });

      const mockJsonFn = vi.fn().mockReturnValue(refreshPromise);
      const mockPost = vi.fn().mockReturnValue({ json: mockJsonFn });
      const mockHttp = { post: mockPost } as any;

      // Start two concurrent refresh calls
      const promise1 = manager.refresh(mockHttp);
      const promise2 = manager.refresh(mockHttp);

      // Only one HTTP call should be made
      expect(mockPost).toHaveBeenCalledTimes(1);

      // Resolve the refresh
      resolveRefresh!(responseTokens);

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe(newAccessToken);
      expect(result2).toBe(newAccessToken);
    });

    it('should allow new refresh after previous one completes', async () => {
      const token1 = createFakeJwt({ exp: Math.floor(Date.now() / 1000) + 900 });
      const token2 = createFakeJwt({ exp: Math.floor(Date.now() / 1000) + 1800 });

      const mockHttp = {
        post: vi.fn()
          .mockReturnValueOnce({
            json: vi.fn().mockResolvedValue({
              accessToken: token1,
              user: { id: 'u1', email: 'test@example.com', role: 'user' },
            }),
          })
          .mockReturnValueOnce({
            json: vi.fn().mockResolvedValue({
              accessToken: token2,
              user: { id: 'u1', email: 'test@example.com', role: 'user' },
            }),
          }),
      } as any;

      await manager.refresh(mockHttp);
      expect(manager.getAccessToken()).toBe(token1);

      await manager.refresh(mockHttp);
      expect(manager.getAccessToken()).toBe(token2);
      expect(mockHttp.post).toHaveBeenCalledTimes(2);
    });

    it('should clear refresh promise on error so retry is possible', async () => {
      const mockHttp = {
        post: vi.fn()
          .mockReturnValueOnce({
            json: vi.fn().mockRejectedValue(new Error('Network error')),
          })
          .mockReturnValueOnce({
            json: vi.fn().mockResolvedValue({
              accessToken: createFakeJwt({ exp: Math.floor(Date.now() / 1000) + 900 }),
              user: { id: 'u1', email: 'test@example.com', role: 'user' },
            }),
          }),
      } as any;

      // First attempt fails
      await expect(manager.refresh(mockHttp)).rejects.toThrow('Network error');

      // Second attempt should work (not stuck on failed promise)
      const result = await manager.refresh(mockHttp);
      expect(result).toBeDefined();
    });
  });
});
