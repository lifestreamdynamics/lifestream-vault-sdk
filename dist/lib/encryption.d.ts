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
export declare function generateVaultKey(): string;
/**
 * Encrypt plaintext content using AES-256-GCM.
 *
 * @param plaintext - The plaintext string to encrypt
 * @param keyHex - The 256-bit key as a hex string
 * @returns The encrypted envelope as a JSON string
 */
export declare function encrypt(plaintext: string, keyHex: string): Promise<string>;
/**
 * Decrypt content from an encrypted envelope using AES-256-GCM.
 *
 * @param envelopeJson - The encrypted envelope as a JSON string
 * @param keyHex - The 256-bit key as a hex string
 * @returns The decrypted plaintext string
 */
export declare function decrypt(envelopeJson: string, keyHex: string): Promise<string>;
/**
 * Check if a string is an encrypted envelope (basic structure check).
 */
export declare function isEncryptedEnvelope(content: string): boolean;
//# sourceMappingURL=encryption.d.ts.map