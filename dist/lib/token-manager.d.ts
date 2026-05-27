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
        displayName?: string;
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
export declare function decodeJwtPayload(token: string): JwtPayload | null;
/**
 * Check if a JWT token is expired or will expire within the given buffer.
 *
 * @param token - The JWT access token
 * @param bufferMs - Milliseconds before actual expiry to consider it "expired"
 * @returns true if the token is expired or will expire within bufferMs
 */
export declare function isTokenExpired(token: string, bufferMs?: number): boolean;
/**
 * Manages JWT access token lifecycle with automatic refresh.
 *
 * Handles:
 * - Proactive refresh before token expiry (beforeRequest hook)
 * - Reactive refresh on 401 responses (afterResponse hook)
 * - Infinite retry prevention via X-Retry-After-Refresh header
 * - Deduplication of concurrent refresh requests
 */
export declare class TokenManager {
    private accessToken;
    private refreshToken;
    private refreshPromise;
    private readonly refreshBufferMs;
    private readonly onTokenRefresh?;
    constructor(accessToken: string, refreshToken: string | null, options?: TokenManagerOptions);
    /** Get the current access token. */
    getAccessToken(): string;
    /** Get the current refresh token. */
    getRefreshToken(): string | null;
    /** Update the access token (e.g., after external login). */
    setAccessToken(token: string): void;
    /** Update the refresh token. */
    setRefreshToken(token: string | null): void;
    /** Check whether the current access token needs refreshing. */
    needsRefresh(): boolean;
    /**
     * Perform a token refresh using the API's /auth/refresh endpoint.
     * Deduplicates concurrent calls so only one HTTP request is made.
     *
     * @param http - The ky instance to use for the refresh request (should NOT have auth hooks)
     * @returns The new access token
     * @throws If refresh fails (no refresh token, network error, etc.)
     */
    refresh(http: KyInstance): Promise<string>;
    private performRefresh;
}
//# sourceMappingURL=token-manager.d.ts.map