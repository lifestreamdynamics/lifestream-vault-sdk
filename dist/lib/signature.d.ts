/**
 * Headers used for HMAC request signing.
 */
export declare const SIGNATURE_HEADER = "x-signature";
export declare const SIGNATURE_TIMESTAMP_HEADER = "x-signature-timestamp";
export declare const SIGNATURE_NONCE_HEADER = "x-signature-nonce";
/**
 * Maximum age (in milliseconds) for a signed request timestamp.
 * Requests older than this are rejected to prevent replay attacks.
 */
export declare const MAX_TIMESTAMP_AGE_MS: number;
/**
 * Constructs the canonical payload string for HMAC signing.
 *
 * Format: METHOD\nPATH\nTIMESTAMP\nNONCE\nBODY_HASH
 *
 * @param method - HTTP method (uppercase)
 * @param path - Request path (no query string)
 * @param timestamp - ISO-8601 timestamp
 * @param nonce - 16-byte hex nonce
 * @param body - Request body string (empty string if no body)
 * @returns The canonical payload string
 */
export declare function buildSignaturePayload(method: string, path: string, timestamp: string, nonce: string, body: string): Promise<string>;
/**
 * Generates an HMAC-SHA256 signature for a request.
 *
 * @param secret - The API key used as the HMAC secret
 * @param payload - The canonical payload string
 * @returns Hex-encoded HMAC signature
 */
export declare function signPayload(secret: string, payload: string): Promise<string>;
/**
 * Generates a cryptographically secure 16-byte hex nonce.
 * Uses the Web Crypto API (available in Node 18+, all modern browsers, Deno, Bun).
 */
export declare function generateNonce(): string;
/**
 * Signs a request and returns the headers to attach.
 *
 * @param apiKey - The full API key (used as HMAC secret)
 * @param method - HTTP method
 * @param path - Request path (without query string)
 * @param body - Request body string (empty string for no body)
 * @returns Object containing the three signature headers
 */
export declare function signRequest(apiKey: string, method: string, path: string, body?: string): Promise<Record<string, string>>;
//# sourceMappingURL=signature.d.ts.map