import type { KyInstance } from 'ky';
import type { MfaStatus, TotpSetupResponse, PasskeyInfo } from '../types/api.js';
/**
 * Resource for managing multi-factor authentication (MFA).
 *
 * Supports TOTP (Time-based One-Time Password) via authenticator apps,
 * passkeys (WebAuthn), and backup codes for account recovery.
 *
 * @example
 * ```typescript
 * // Check current MFA status
 * const status = await client.mfa.getStatus();
 * if (!status.totpConfigured) {
 *   // Set up TOTP
 *   const setup = await client.mfa.setupTotp();
 *   console.log('Scan QR code:', setup.qrCodeDataUri);
 *   // Verify with code from authenticator app
 *   const { backupCodes } = await client.mfa.verifyTotp('123456');
 *   console.log('Save these backup codes:', backupCodes);
 * }
 * ```
 */
export declare class MfaResource {
    private http;
    constructor(http: KyInstance);
    /**
     * Retrieves the current MFA status for the authenticated user.
     *
     * @returns MFA status including TOTP configuration, passkey count, and backup codes remaining
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const status = await client.mfa.getStatus();
     * console.log('MFA enabled:', status.mfaEnabled);
     * console.log('TOTP configured:', status.totpConfigured);
     * console.log('Passkeys registered:', status.passkeyCount);
     * console.log('Backup codes remaining:', status.backupCodesRemaining);
     * ```
     */
    getStatus(): Promise<MfaStatus>;
    /**
     * Initiates TOTP (authenticator app) setup.
     *
     * Returns a secret key, OTP auth URI, and QR code data URI that can be
     * scanned by authenticator apps like Google Authenticator, Authy, or 1Password.
     * TOTP is not enabled until you call {@link verifyTotp} with a valid code.
     *
     * @returns TOTP setup data including secret, OTP auth URI, and QR code
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {ConflictError} If TOTP is already configured
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const setup = await client.mfa.setupTotp();
     * console.log('Secret:', setup.secret);
     * console.log('URI:', setup.otpauthUri);
     * // Display QR code to user
     * document.querySelector('img').src = setup.qrCodeDataUri;
     * ```
     */
    setupTotp(): Promise<TotpSetupResponse>;
    /**
     * Verifies TOTP setup with a code from the authenticator app.
     *
     * Once verified, TOTP is enabled and backup codes are generated.
     * **Save the backup codes immediately** — they are only shown once.
     *
     * @param code - 6-digit code from the authenticator app
     * @returns Backup codes for account recovery (store securely)
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {ValidationError} If the code is invalid or expired
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const { backupCodes } = await client.mfa.verifyTotp('123456');
     * console.log('Backup codes:', backupCodes);
     * // Store backup codes securely!
     * ```
     */
    verifyTotp(code: string): Promise<{
        backupCodes: string[];
    }>;
    /**
     * Disables TOTP authentication.
     *
     * Requires the user's password for security. After disabling TOTP,
     * MFA may still be enabled if passkeys are registered.
     *
     * @param password - The user's current password
     * @throws {AuthenticationError} If the request is not authenticated or password is incorrect
     * @throws {ValidationError} If the password is invalid
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * await client.mfa.disableTotp('my-secure-password');
     * console.log('TOTP disabled');
     * ```
     */
    disableTotp(password: string): Promise<{
        message: string;
    }>;
    /**
     * Lists all registered passkeys for the authenticated user.
     *
     * @returns Array of passkey metadata including ID, name, and last used timestamp
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const { passkeys } = await client.mfa.listPasskeys();
     * for (const pk of passkeys) {
     *   console.log(`${pk.name} (created ${pk.createdAt}, last used ${pk.lastUsedAt || 'never'})`);
     * }
     * ```
     */
    listPasskeys(): Promise<{
        passkeys: PasskeyInfo[];
    }>;
    /**
     * Deletes a registered passkey.
     *
     * Requires password confirmation if it's the user's last MFA method
     * (to prevent account lockout).
     *
     * @param id - Passkey ID to delete
     * @param password - User password (required if this is the last MFA method)
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NotFoundError} If the passkey does not exist
     * @throws {ValidationError} If password is required but not provided
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * await client.mfa.deletePasskey('passkey-id-123');
     * console.log('Passkey deleted');
     * ```
     */
    deletePasskey(id: string, password?: string): Promise<{
        message: string;
    }>;
    /**
     * Renames a registered passkey.
     *
     * Useful for identifying devices (e.g., "YubiKey 5", "iPhone 15", "Work Laptop").
     *
     * @param id - Passkey ID to rename
     * @param name - New name for the passkey
     * @returns Updated passkey metadata
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NotFoundError} If the passkey does not exist
     * @throws {ValidationError} If the name is invalid
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const passkey = await client.mfa.renamePasskey('passkey-id-123', 'YubiKey 5');
     * console.log('Renamed to:', passkey.name);
     * ```
     */
    renamePasskey(id: string, name: string): Promise<PasskeyInfo>;
    /**
     * Regenerates backup codes.
     *
     * Invalidates all existing backup codes and generates a new set.
     * Requires password confirmation. **Save the new codes immediately** — they are only shown once.
     *
     * @param password - User's current password
     * @returns New set of backup codes (store securely)
     * @throws {AuthenticationError} If the request is not authenticated or password is incorrect
     * @throws {ValidationError} If the password is invalid
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const { backupCodes } = await client.mfa.regenerateBackupCodes('my-password');
     * console.log('New backup codes:', backupCodes);
     * // Store backup codes securely!
     * ```
     */
    regenerateBackupCodes(password: string): Promise<{
        backupCodes: string[];
    }>;
}
//# sourceMappingURL=mfa.d.ts.map