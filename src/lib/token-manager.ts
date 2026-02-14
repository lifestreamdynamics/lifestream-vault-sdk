import type { KyInstance } from 'ky';

/** Decoded JWT payload with standard claims. */
export interface JwtPayload {
  exp: number;
  iat?: number;
  sub?: string;
  email?: string;
  [key: string]: unknown;
}

/** Authentication tokens returned from login/refresh. */
export interface AuthTokens {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
    [key: string]: unknown;
  };
}

/** Callback invoked when tokens are refreshed. */
export type OnTokenRefresh = (tokens: AuthTokens) => void;

/** Options for configuring the TokenManager. */
export interface TokenManagerOptions {
  /** How many milliseconds before expiry to trigger a proactive refresh. Default: 60000 (1 min). */
  refreshBufferMs?: number;
  /** Called after a successful token refresh. */
  onTokenRefresh?: OnTokenRefresh;
}

/**
 * Decode a JWT payload without verification.
 * Only decodes the payload section (second segment) from base64url.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // Base64url to base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Pad if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    // Decode - works in both Node.js and browser
    const decoded = typeof atob === 'function'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('utf-8');

    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired or will expire within the given buffer.
 *
 * @param token - The JWT access token
 * @param bufferMs - Milliseconds before actual expiry to consider it "expired"
 * @returns true if the token is expired or will expire within bufferMs
 */
export function isTokenExpired(token: string, bufferMs: number = 60_000): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;

  const expiresAtMs = payload.exp * 1000;
  return Date.now() > expiresAtMs - bufferMs;
}

/**
 * Manages JWT access token lifecycle with automatic refresh.
 *
 * Handles:
 * - Proactive refresh before token expiry (beforeRequest hook)
 * - Reactive refresh on 401 responses (afterResponse hook)
 * - Infinite retry prevention via X-Retry-After-Refresh header
 * - Deduplication of concurrent refresh requests
 */
export class TokenManager {
  private accessToken: string;
  private refreshToken: string | null;
  private refreshPromise: Promise<string> | null = null;
  private readonly refreshBufferMs: number;
  private readonly onTokenRefresh?: OnTokenRefresh;

  constructor(
    accessToken: string,
    refreshToken: string | null,
    options: TokenManagerOptions = {},
  ) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.refreshBufferMs = options.refreshBufferMs ?? 60_000;
    this.onTokenRefresh = options.onTokenRefresh;
  }

  /** Get the current access token. */
  getAccessToken(): string {
    return this.accessToken;
  }

  /** Get the current refresh token. */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /** Update the access token (e.g., after external login). */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /** Update the refresh token. */
  setRefreshToken(token: string | null): void {
    this.refreshToken = token;
  }

  /** Check whether the current access token needs refreshing. */
  needsRefresh(): boolean {
    return isTokenExpired(this.accessToken, this.refreshBufferMs);
  }

  /**
   * Perform a token refresh using the API's /auth/refresh endpoint.
   * Deduplicates concurrent calls so only one HTTP request is made.
   *
   * @param http - The ky instance to use for the refresh request (should NOT have auth hooks)
   * @returns The new access token
   * @throws If refresh fails (no refresh token, network error, etc.)
   */
  async refresh(http: KyInstance): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Deduplicate concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh(http);

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(http: KyInstance): Promise<string> {
    const response = await http.post('auth/refresh', {
      headers: {
        'X-Requested-With': 'LifestreamVaultSDK',
        'Cookie': `lsv_refresh=${this.refreshToken}`,
      },
    }).json<AuthTokens>();

    this.accessToken = response.accessToken;
    this.onTokenRefresh?.(response);

    return this.accessToken;
  }
}
