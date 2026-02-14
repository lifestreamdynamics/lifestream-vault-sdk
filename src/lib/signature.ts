import crypto from 'node:crypto';

/**
 * Headers used for HMAC request signing.
 */
export const SIGNATURE_HEADER = 'x-signature';
export const SIGNATURE_TIMESTAMP_HEADER = 'x-signature-timestamp';
export const SIGNATURE_NONCE_HEADER = 'x-signature-nonce';

/**
 * Maximum age (in milliseconds) for a signed request timestamp.
 * Requests older than this are rejected to prevent replay attacks.
 */
export const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000; // 5 minutes

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
export function buildSignaturePayload(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  body: string,
): string {
  const bodyHash = crypto
    .createHash('sha256')
    .update(body)
    .digest('hex');
  return `${method.toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
}

/**
 * Generates an HMAC-SHA256 signature for a request.
 *
 * @param secret - The API key used as the HMAC secret
 * @param payload - The canonical payload string
 * @returns Hex-encoded HMAC signature
 */
export function signPayload(secret: string, payload: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Generates a cryptographically secure 16-byte hex nonce.
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Signs a request and returns the headers to attach.
 *
 * @param apiKey - The full API key (used as HMAC secret)
 * @param method - HTTP method
 * @param path - Request path (without query string)
 * @param body - Request body string (empty string for no body)
 * @returns Object containing the three signature headers
 */
export function signRequest(
  apiKey: string,
  method: string,
  path: string,
  body: string = '',
): Record<string, string> {
  const timestamp = new Date().toISOString();
  const nonce = generateNonce();
  const payload = buildSignaturePayload(method, path, timestamp, nonce, body);
  const signature = signPayload(apiKey, payload);

  return {
    [SIGNATURE_HEADER]: signature,
    [SIGNATURE_TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_NONCE_HEADER]: nonce,
  };
}
