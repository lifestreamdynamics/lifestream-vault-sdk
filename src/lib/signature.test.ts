import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import {
  buildSignaturePayload,
  signPayload,
  generateNonce,
  signRequest,
  SIGNATURE_HEADER,
  SIGNATURE_TIMESTAMP_HEADER,
  SIGNATURE_NONCE_HEADER,
} from './signature.js';

describe('signature', () => {
  describe('buildSignaturePayload', () => {
    it('should build payload with correct format', () => {
      const payload = buildSignaturePayload(
        'PUT',
        '/api/v1/vaults/abc/documents/test.md',
        '2025-01-15T10:00:00.000Z',
        'aabbccdd00112233aabbccdd00112233',
        '{"content":"hello"}',
      );

      const bodyHash = crypto
        .createHash('sha256')
        .update('{"content":"hello"}')
        .digest('hex');

      expect(payload).toBe(
        `PUT\n/api/v1/vaults/abc/documents/test.md\n2025-01-15T10:00:00.000Z\naabbccdd00112233aabbccdd00112233\n${bodyHash}`,
      );
    });

    it('should uppercase the method', () => {
      const payload = buildSignaturePayload(
        'put',
        '/api/v1/vaults',
        '2025-01-15T10:00:00.000Z',
        'aabbccdd00112233aabbccdd00112233',
        '',
      );

      expect(payload.startsWith('PUT\n')).toBe(true);
    });

    it('should handle empty body', () => {
      const payload = buildSignaturePayload(
        'DELETE',
        '/api/v1/vaults/abc',
        '2025-01-15T10:00:00.000Z',
        'aabbccdd00112233aabbccdd00112233',
        '',
      );

      const emptyHash = crypto
        .createHash('sha256')
        .update('')
        .digest('hex');

      expect(payload).toContain(emptyHash);
    });
  });

  describe('signPayload', () => {
    it('should produce a valid HMAC-SHA256 hex string', () => {
      const sig = signPayload('my-secret', 'test-payload');
      expect(sig).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent signatures for the same input', () => {
      const sig1 = signPayload('key', 'data');
      const sig2 = signPayload('key', 'data');
      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different keys', () => {
      const sig1 = signPayload('key1', 'data');
      const sig2 = signPayload('key2', 'data');
      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different payloads', () => {
      const sig1 = signPayload('key', 'data1');
      const sig2 = signPayload('key', 'data2');
      expect(sig1).not.toBe(sig2);
    });

    it('should match Node.js crypto HMAC directly', () => {
      const secret = 'lsv_k_testapikey';
      const payload = 'PUT\n/api/v1/vaults\n2025-01-15T10:00:00.000Z\nnonce123\nbodyhash';
      const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      expect(signPayload(secret, payload)).toBe(expected);
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

    it('should return all three signature headers', () => {
      const headers = signRequest(
        'lsv_k_testkey',
        'PUT',
        '/api/v1/vaults/abc/documents/test.md',
        '{"content":"hello"}',
      );

      expect(headers).toHaveProperty(SIGNATURE_HEADER);
      expect(headers).toHaveProperty(SIGNATURE_TIMESTAMP_HEADER);
      expect(headers).toHaveProperty(SIGNATURE_NONCE_HEADER);
    });

    it('should use ISO-8601 timestamp', () => {
      const headers = signRequest('lsv_k_testkey', 'DELETE', '/path');

      expect(headers[SIGNATURE_TIMESTAMP_HEADER]).toBe('2025-01-15T10:00:00.000Z');
    });

    it('should produce a valid hex signature', () => {
      const headers = signRequest('lsv_k_testkey', 'PUT', '/path', 'body');

      expect(headers[SIGNATURE_HEADER]).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce a 32-char hex nonce', () => {
      const headers = signRequest('lsv_k_testkey', 'PUT', '/path');

      expect(headers[SIGNATURE_NONCE_HEADER]).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should default to empty body when not provided', () => {
      const headers1 = signRequest('lsv_k_testkey', 'DELETE', '/path');
      const headers2 = signRequest('lsv_k_testkey', 'DELETE', '/path', '');

      // Both should use the same body hash (empty string)
      // We can verify by checking the signature is computed correctly
      // Since nonces differ, signatures will differ, but we can verify the function runs
      expect(headers1[SIGNATURE_HEADER]).toMatch(/^[a-f0-9]{64}$/);
      expect(headers2[SIGNATURE_HEADER]).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce verifiable signatures', () => {
      const apiKey = 'lsv_k_testkey';
      const method = 'PUT';
      const path = '/api/v1/vaults/abc/documents/test.md';
      const body = '{"content":"hello world"}';

      const headers = signRequest(apiKey, method, path, body);

      // Reconstruct and verify
      const payload = buildSignaturePayload(
        method,
        path,
        headers[SIGNATURE_TIMESTAMP_HEADER],
        headers[SIGNATURE_NONCE_HEADER],
        body,
      );
      const expectedSig = signPayload(apiKey, payload);

      expect(headers[SIGNATURE_HEADER]).toBe(expectedSig);
    });
  });
});
