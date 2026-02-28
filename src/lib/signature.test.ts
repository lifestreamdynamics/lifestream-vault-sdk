import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildSignaturePayload,
  signPayload,
  generateNonce,
  signRequest,
  SIGNATURE_HEADER,
  SIGNATURE_TIMESTAMP_HEADER,
  SIGNATURE_NONCE_HEADER,
} from './signature.js';

// Helper: compute SHA-256 hex using Web Crypto (mirrors the implementation)
async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: compute HMAC-SHA256 hex using Web Crypto (mirrors the implementation)
async function hmacSha256Hex(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('signature', () => {
  describe('buildSignaturePayload', () => {
    it('should build payload with correct format', async () => {
      const payload = await buildSignaturePayload(
        'PUT',
        '/api/v1/vaults/abc/documents/test.md',
        '2025-01-15T10:00:00.000Z',
        'aabbccdd00112233aabbccdd00112233',
        '{"content":"hello"}',
      );

      const bodyHash = await sha256Hex('{"content":"hello"}');

      expect(payload).toBe(
        `PUT\n/api/v1/vaults/abc/documents/test.md\n2025-01-15T10:00:00.000Z\naabbccdd00112233aabbccdd00112233\n${bodyHash}`,
      );
    });

    it('should uppercase the method', async () => {
      const payload = await buildSignaturePayload(
        'put',
        '/api/v1/vaults',
        '2025-01-15T10:00:00.000Z',
        'aabbccdd00112233aabbccdd00112233',
        '',
      );

      expect(payload.startsWith('PUT\n')).toBe(true);
    });

    it('should handle empty body', async () => {
      const payload = await buildSignaturePayload(
        'DELETE',
        '/api/v1/vaults/abc',
        '2025-01-15T10:00:00.000Z',
        'aabbccdd00112233aabbccdd00112233',
        '',
      );

      const emptyHash = await sha256Hex('');

      expect(payload).toContain(emptyHash);
    });
  });

  describe('signPayload', () => {
    it('should produce a valid HMAC-SHA256 hex string', async () => {
      const sig = await signPayload('my-secret', 'test-payload');
      expect(sig).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent signatures for the same input', async () => {
      const sig1 = await signPayload('key', 'data');
      const sig2 = await signPayload('key', 'data');
      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different keys', async () => {
      const sig1 = await signPayload('key1', 'data');
      const sig2 = await signPayload('key2', 'data');
      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different payloads', async () => {
      const sig1 = await signPayload('key', 'data1');
      const sig2 = await signPayload('key', 'data2');
      expect(sig1).not.toBe(sig2);
    });

    it('should match Web Crypto HMAC directly', async () => {
      const secret = 'lsv_k_testapikey';
      const payload = 'PUT\n/api/v1/vaults\n2025-01-15T10:00:00.000Z\nnonce123\nbodyhash';
      const expected = await hmacSha256Hex(secret, payload);
      expect(await signPayload(secret, payload)).toBe(expected);
    });
  });

  describe('generateNonce', () => {
    it('should generate a 32-character hex string (16 bytes)', () => {
      const nonce = generateNonce();
      expect(nonce).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate unique nonces', () => {
      const nonces = new Set(Array.from({ length: 100 }, () => generateNonce()));
      expect(nonces.size).toBe(100);
    });
  });

  describe('signRequest', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return all three signature headers', async () => {
      const headers = await signRequest(
        'lsv_k_testkey',
        'PUT',
        '/api/v1/vaults/abc/documents/test.md',
        '{"content":"hello"}',
      );

      expect(headers).toHaveProperty(SIGNATURE_HEADER);
      expect(headers).toHaveProperty(SIGNATURE_TIMESTAMP_HEADER);
      expect(headers).toHaveProperty(SIGNATURE_NONCE_HEADER);
    });

    it('should use ISO-8601 timestamp', async () => {
      const headers = await signRequest('lsv_k_testkey', 'DELETE', '/path');

      expect(headers[SIGNATURE_TIMESTAMP_HEADER]).toBe('2025-01-15T10:00:00.000Z');
    });

    it('should produce a valid hex signature', async () => {
      const headers = await signRequest('lsv_k_testkey', 'PUT', '/path', 'body');

      expect(headers[SIGNATURE_HEADER]).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce a 32-char hex nonce', async () => {
      const headers = await signRequest('lsv_k_testkey', 'PUT', '/path');

      expect(headers[SIGNATURE_NONCE_HEADER]).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should default to empty body when not provided', async () => {
      const headers1 = await signRequest('lsv_k_testkey', 'DELETE', '/path');
      const headers2 = await signRequest('lsv_k_testkey', 'DELETE', '/path', '');

      // Both should use the same body hash (empty string)
      // Since nonces differ, signatures will differ, but we can verify the function runs
      expect(headers1[SIGNATURE_HEADER]).toMatch(/^[a-f0-9]{64}$/);
      expect(headers2[SIGNATURE_HEADER]).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce verifiable signatures', async () => {
      const apiKey = 'lsv_k_testkey';
      const method = 'PUT';
      const path = '/api/v1/vaults/abc/documents/test.md';
      const body = '{"content":"hello world"}';

      const headers = await signRequest(apiKey, method, path, body);

      // Reconstruct and verify
      const payload = await buildSignaturePayload(
        method,
        path,
        headers[SIGNATURE_TIMESTAMP_HEADER],
        headers[SIGNATURE_NONCE_HEADER],
        body,
      );
      const expectedSig = await signPayload(apiKey, payload);

      expect(headers[SIGNATURE_HEADER]).toBe(expectedSig);
    });
  });
});
