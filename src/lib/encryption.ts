import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits

/** Envelope format for encrypted document content. */
export interface EncryptedEnvelope {
  version: 1;
  algorithm: 'aes-256-gcm';
  iv: string;
  authTag: string;
  ciphertext: string;
}

/**
 * Generate a random 256-bit encryption key.
 * Returns the key as a hex string (64 characters).
 */
export function generateVaultKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypt plaintext content using AES-256-GCM.
 *
 * @param plaintext - The plaintext string to encrypt
 * @param keyHex - The 256-bit key as a hex string
 * @returns The encrypted envelope as a JSON string
 */
export function encrypt(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${key.length}`);
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const envelope: EncryptedEnvelope = {
    version: 1,
    algorithm: ALGORITHM,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };

  return JSON.stringify(envelope);
}

/**
 * Decrypt content from an encrypted envelope using AES-256-GCM.
 *
 * @param envelopeJson - The encrypted envelope as a JSON string
 * @param keyHex - The 256-bit key as a hex string
 * @returns The decrypted plaintext string
 */
export function decrypt(envelopeJson: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${key.length}`);
  }

  const envelope: EncryptedEnvelope = JSON.parse(envelopeJson);

  if (envelope.version !== 1) {
    throw new Error(`Unsupported encryption envelope version: ${envelope.version}`);
  }
  if (envelope.algorithm !== ALGORITHM) {
    throw new Error(`Unsupported encryption algorithm: ${envelope.algorithm}`);
  }

  const iv = Buffer.from(envelope.iv, 'hex');
  const authTag = Buffer.from(envelope.authTag, 'hex');
  const ciphertext = Buffer.from(envelope.ciphertext, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Check if a string is an encrypted envelope (basic structure check).
 */
export function isEncryptedEnvelope(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return (
      parsed.version === 1
      && parsed.algorithm === ALGORITHM
      && typeof parsed.iv === 'string'
      && typeof parsed.authTag === 'string'
      && typeof parsed.ciphertext === 'string'
    );
  } catch {
    return false;
  }
}
