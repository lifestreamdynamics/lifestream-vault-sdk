const ALGORITHM = 'AES-GCM';
const KEY_LENGTH_BYTES = 32; // 256 bits
const IV_LENGTH_BYTES = 12; // 96 bits (recommended for GCM)
const AUTH_TAG_LENGTH_BYTES = 16; // 128 bits

/** Envelope format for encrypted document content. */
export interface EncryptedEnvelope {
  version: 1;
  algorithm: 'aes-256-gcm';
  iv: string;
  authTag: string;
  ciphertext: string;
}

/** Convert a Uint8Array to a lowercase hex string. */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Convert a hex string to a Uint8Array. */
function fromHex(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return result;
}

/** Import a raw 256-bit key hex string as a Web Crypto AES-GCM CryptoKey. */
async function importKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = fromHex(keyHex);
  if (keyBytes.length !== KEY_LENGTH_BYTES) {
    throw new Error(`Invalid key length: expected ${KEY_LENGTH_BYTES} bytes, got ${keyBytes.length}`);
  }
  return globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Generate a random 256-bit encryption key.
 * Returns the key as a hex string (64 characters).
 */
export function generateVaultKey(): string {
  const bytes = new Uint8Array(KEY_LENGTH_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/**
 * Encrypt plaintext content using AES-256-GCM.
 *
 * @param plaintext - The plaintext string to encrypt
 * @param keyHex - The 256-bit key as a hex string
 * @returns The encrypted envelope as a JSON string
 */
export async function encrypt(plaintext: string, keyHex: string): Promise<string> {
  const key = await importKey(keyHex);

  const iv = new Uint8Array(IV_LENGTH_BYTES);
  globalThis.crypto.getRandomValues(iv);

  const encoded = new TextEncoder().encode(plaintext);

  // AES-GCM output from subtle.encrypt is ciphertext + 16-byte auth tag appended
  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: AUTH_TAG_LENGTH_BYTES * 8 },
    key,
    encoded,
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  // The Web Crypto API appends the auth tag to the end of the ciphertext
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - AUTH_TAG_LENGTH_BYTES);
  const authTag = encryptedBytes.slice(encryptedBytes.length - AUTH_TAG_LENGTH_BYTES);

  const envelope: EncryptedEnvelope = {
    version: 1,
    algorithm: 'aes-256-gcm',
    iv: toHex(iv),
    authTag: toHex(authTag),
    ciphertext: toHex(ciphertext),
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
export async function decrypt(envelopeJson: string, keyHex: string): Promise<string> {
  // Validate key length before parsing envelope so we throw the right error first
  const keyBytes = fromHex(keyHex);
  if (keyBytes.length !== KEY_LENGTH_BYTES) {
    throw new Error(`Invalid key length: expected ${KEY_LENGTH_BYTES} bytes, got ${keyBytes.length}`);
  }

  let envelope: EncryptedEnvelope;
  try {
    envelope = JSON.parse(envelopeJson) as EncryptedEnvelope;
  } catch {
    throw new Error('Invalid encrypted envelope: not valid JSON');
  }

  if (envelope.version !== 1) {
    throw new Error(`Unsupported encryption envelope version: ${envelope.version}`);
  }
  if (envelope.algorithm !== 'aes-256-gcm') {
    throw new Error(`Unsupported encryption algorithm: ${envelope.algorithm}`);
  }

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt'],
  );

  const iv = fromHex(envelope.iv);
  const authTag = fromHex(envelope.authTag);
  const ciphertext = fromHex(envelope.ciphertext);

  // Reattach the auth tag at the end for Web Crypto (which expects ciphertext + tag combined)
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv as BufferSource, tagLength: AUTH_TAG_LENGTH_BYTES * 8 },
    key,
    combined as BufferSource,
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Check if a string is an encrypted envelope (basic structure check).
 */
export function isEncryptedEnvelope(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return (
      parsed.version === 1
      && parsed.algorithm === 'aes-256-gcm'
      && typeof parsed.iv === 'string'
      && typeof parsed.authTag === 'string'
      && typeof parsed.ciphertext === 'string'
    );
  } catch {
    return false;
  }
}
