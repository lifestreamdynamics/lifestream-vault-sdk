import { describe, it, expect } from 'vitest';
import {
  generateVaultKey,
  encrypt,
  decrypt,
  isEncryptedEnvelope,
  type EncryptedEnvelope,
} from './encryption.js';

describe('encryption', () => {
  describe('generateVaultKey', () => {
    it('should generate a 64-character hex string (256 bits)', () => {
      const key = generateVaultKey();
      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = generateVaultKey();
      const key2 = generateVaultKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('encrypt/decrypt roundtrip', () => {
    it('should encrypt and decrypt a simple string', async () => {
      const key = generateVaultKey();
      const plaintext = 'Hello, World!';

      const encrypted = await encrypt(plaintext, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt markdown content', async () => {
      const key = generateVaultKey();
      const plaintext = `---
title: Secret Notes
tags: [private, sensitive]
---

# Secret Notes

This is a **confidential** document with:
- Sensitive data
- Private information
- Unicode: \u00e9\u00e8\u00ea \u00fc\u00f6\u00e4 \u2603\ufe0f\ud83d\ude80
`;

      const encrypted = await encrypt(plaintext, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt empty string', async () => {
      const key = generateVaultKey();
      const plaintext = '';

      const encrypted = await encrypt(plaintext, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt large content', async () => {
      const key = generateVaultKey();
      const plaintext = 'x'.repeat(1_000_000); // 1MB

      const encrypted = await encrypt(plaintext, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for the same plaintext (random IV)', async () => {
      const key = generateVaultKey();
      const plaintext = 'Same content';

      const encrypted1 = await encrypt(plaintext, key);
      const encrypted2 = await encrypt(plaintext, key);

      expect(encrypted1).not.toBe(encrypted2);

      // Both should decrypt to the same plaintext
      expect(await decrypt(encrypted1, key)).toBe(plaintext);
      expect(await decrypt(encrypted2, key)).toBe(plaintext);
    });
  });

  describe('envelope format', () => {
    it('should produce a valid JSON envelope', async () => {
      const key = generateVaultKey();
      const encrypted = await encrypt('test', key);
      const envelope: EncryptedEnvelope = JSON.parse(encrypted);

      expect(envelope.version).toBe(1);
      expect(envelope.algorithm).toBe('aes-256-gcm');
      expect(envelope.iv).toHaveLength(24); // 12 bytes = 24 hex chars
      expect(envelope.authTag).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(typeof envelope.ciphertext).toBe('string');
      expect(envelope.ciphertext.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should reject wrong key length', async () => {
      await expect(encrypt('test', 'tooshort')).rejects.toThrow('Invalid key length');
      await expect(decrypt('{}', 'tooshort')).rejects.toThrow('Invalid key length');
    });

    it('should fail to decrypt with wrong key', async () => {
      const key1 = generateVaultKey();
      const key2 = generateVaultKey();

      const encrypted = await encrypt('secret', key1);

      await expect(decrypt(encrypted, key2)).rejects.toThrow();
    });

    it('should fail to decrypt tampered ciphertext', async () => {
      const key = generateVaultKey();
      const encrypted = await encrypt('secret', key);
      const envelope: EncryptedEnvelope = JSON.parse(encrypted);

      // Tamper with ciphertext
      envelope.ciphertext = 'ff' + envelope.ciphertext.slice(2);
      const tampered = JSON.stringify(envelope);

      await expect(decrypt(tampered, key)).rejects.toThrow();
    });

    it('should fail to decrypt tampered auth tag', async () => {
      const key = generateVaultKey();
      const encrypted = await encrypt('secret', key);
      const envelope: EncryptedEnvelope = JSON.parse(encrypted);

      // Tamper with auth tag
      envelope.authTag = '00'.repeat(16);
      const tampered = JSON.stringify(envelope);

      await expect(decrypt(tampered, key)).rejects.toThrow();
    });

    it('should reject unsupported envelope version', async () => {
      const key = generateVaultKey();
      const envelope = JSON.stringify({
        version: 2,
        algorithm: 'aes-256-gcm',
        iv: '00'.repeat(12),
        authTag: '00'.repeat(16),
        ciphertext: '00',
      });

      await expect(decrypt(envelope, key)).rejects.toThrow('Unsupported encryption envelope version');
    });

    it('should reject unsupported algorithm', async () => {
      const key = generateVaultKey();
      const envelope = JSON.stringify({
        version: 1,
        algorithm: 'chacha20-poly1305',
        iv: '00'.repeat(12),
        authTag: '00'.repeat(16),
        ciphertext: '00',
      });

      await expect(decrypt(envelope, key)).rejects.toThrow('Unsupported encryption algorithm');
    });

    it('should reject invalid JSON with a typed error message', async () => {
      const key = generateVaultKey();
      await expect(decrypt('not json', key)).rejects.toThrow(
        'Invalid encrypted envelope: not valid JSON',
      );
    });
  });

  describe('isEncryptedEnvelope', () => {
    it('should return true for valid envelopes', async () => {
      const key = generateVaultKey();
      const encrypted = await encrypt('test', key);
      expect(isEncryptedEnvelope(encrypted)).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(isEncryptedEnvelope('# Hello World')).toBe(false);
    });

    it('should return false for invalid JSON', () => {
      expect(isEncryptedEnvelope('not json')).toBe(false);
    });

    it('should return false for JSON without required fields', () => {
      expect(isEncryptedEnvelope('{"version": 1}')).toBe(false);
      expect(isEncryptedEnvelope('{}')).toBe(false);
    });

    it('should return false for wrong version', () => {
      expect(isEncryptedEnvelope(JSON.stringify({
        version: 2,
        algorithm: 'aes-256-gcm',
        iv: 'abc',
        authTag: 'def',
        ciphertext: 'ghi',
      }))).toBe(false);
    });
  });
});
