/**
 * Decode a JWT payload without verification.
 * Only decodes the payload section (second segment) from base64url.
 */
export function decodeJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const payload = parts[1];
        // Base64url to base64
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        // Pad if needed
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        // Decode - works in both Node.js and browser
        const decoded = typeof atob === 'function'
            ? atob(padded)
            : Buffer.from(padded, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    }
    catch {
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
export function isTokenExpired(token, bufferMs = 60_000) {
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp)
        return true;
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
    accessToken;
    refreshToken;
    refreshPromise = null;
    refreshBufferMs;
    onTokenRefresh;
    constructor(accessToken, refreshToken, options = {}) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.refreshBufferMs = options.refreshBufferMs ?? 60_000;
        this.onTokenRefresh = options.onTokenRefresh;
    }
    /** Get the current access token. */
    getAccessToken() {
        return this.accessToken;
    }
    /** Get the current refresh token. */
    getRefreshToken() {
        return this.refreshToken;
    }
    /** Update the access token (e.g., after external login). */
    setAccessToken(token) {
        this.accessToken = token;
    }
    /** Update the refresh token. */
    setRefreshToken(token) {
        this.refreshToken = token;
    }
    /** Check whether the current access token needs refreshing. */
    needsRefresh() {
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
    async refresh(http) {
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
        }
        finally {
            this.refreshPromise = null;
        }
    }
    async performRefresh(http) {
        // The Cookie header is a forbidden header in browsers and will be silently
        // stripped. In browser environments we rely on the httpOnly cookie being
        // sent automatically via credentials: 'include'. In Node.js / server
        // environments we set it explicitly.
        const isBrowser = typeof globalThis.document !== 'undefined';
        const headers = {
            'X-Requested-With': 'LifestreamVaultSDK',
        };
        if (!isBrowser && this.refreshToken) {
            headers['Cookie'] = `lsv_refresh=${this.refreshToken}`;
        }
        const response = await http.post('auth/refresh', {
            headers,
            ...(isBrowser ? { credentials: 'include' } : {}),
        });
        const data = await response.json();
        this.accessToken = data.accessToken;
        // Support refresh token rotation: if the server rotated the refresh token,
        // capture the new value from the Set-Cookie header (Node.js) or store it
        // from the response body if the API ever includes it there.
        const setCookie = response.headers?.get?.('set-cookie');
        if (setCookie) {
            const match = setCookie.match(/lsv_refresh=([^;]+)/);
            if (match) {
                this.refreshToken = match[1];
            }
        }
        this.onTokenRefresh?.(data);
        return this.accessToken;
    }
}
//# sourceMappingURL=token-manager.js.map