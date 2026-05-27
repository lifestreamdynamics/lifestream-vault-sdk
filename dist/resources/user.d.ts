import type { KyInstance } from 'ky';
/** The authenticated user's profile. */
export interface User {
    /** Unique user identifier. */
    id: string;
    /** User email address. */
    email: string;
    /** Display name, if set. */
    displayName: string | null;
    /** User role (`user` or `admin`). */
    role: string;
    /** Current subscription tier (`free`, `pro`, or `business`). */
    subscriptionTier?: string;
    /** ISO 8601 subscription expiry timestamp, or `null` for free tier. */
    subscriptionExpiresAt?: string | null;
    /** ISO 8601 account creation timestamp. */
    createdAt: string;
    /** ISO 8601 last-updated timestamp. */
    updatedAt: string;
}
/** Per-vault storage breakdown entry. */
export interface VaultStorage {
    /** Vault identifier. */
    vaultId: string;
    /** Vault display name. */
    name: string;
    /** Total bytes used by documents in this vault. */
    bytes: number;
    /** Number of documents in this vault. */
    documentCount: number;
}
/** Storage usage statistics for the authenticated user. */
export interface StorageUsage {
    /** Total bytes used across all vaults. */
    totalBytes: number;
    /** Maximum bytes allowed by the user's plan. */
    limitBytes: number;
    /** Per-vault storage breakdown. */
    vaults: VaultStorage[];
    /** Total number of vaults. */
    vaultCount: number;
    /** Maximum number of vaults allowed by the user's plan. */
    vaultLimit: number;
    /** Current subscription tier. */
    tier: string;
}
/** An active session for the authenticated user. */
export interface AccountSession {
    /** Unique session identifier. */
    id: string;
    /** ISO 8601 timestamp when the session was created. */
    createdAt: string;
    /** ISO 8601 timestamp when the session was last active. */
    lastSeenAt: string;
    /** IP address associated with the session, or `null` if unavailable. */
    ipAddress: string | null;
    /** User-Agent string for the session, or `null` if unavailable. */
    userAgent: string | null;
    /** Whether this is the currently active session. */
    current: boolean;
}
/** A data export record for the authenticated user. */
export interface DataExportRecord {
    /** Unique export identifier. */
    id: string;
    /** Current status of the export job. */
    status: 'pending' | 'processing' | 'complete' | 'failed';
    /** Export file format (e.g. `zip`). */
    format: string;
    /** ISO 8601 timestamp when the export was requested. */
    createdAt: string;
    /** ISO 8601 timestamp when the export completed, if applicable. */
    completedAt?: string;
    /** Presigned download URL, available once status is `complete`. */
    downloadUrl?: string;
}
/** A consent record for the authenticated user. */
export interface ConsentRecord {
    /** Type of consent (e.g. `tos`, `privacy_policy`). */
    consentType: string;
    /** Version of the document consented to. */
    version: string;
    /** Whether consent was granted (`true`) or withdrawn (`false`). */
    granted: boolean;
    /** ISO 8601 timestamp when consent was recorded. */
    recordedAt: string;
}
/** A team invitation received by the authenticated user. */
export interface TeamInvitationInboxItem {
    /** Unique invitation identifier. */
    id: string;
    /** Identifier of the team that sent the invitation. */
    teamId: string;
    /** Display name of the team. */
    teamName: string;
    /** Role the user will receive upon accepting. */
    role: 'owner' | 'admin' | 'editor' | 'viewer';
    /** Email or name of the user who sent the invitation. */
    invitedBy: string;
    /** ISO 8601 timestamp when the invitation was created. */
    createdAt: string;
    /** ISO 8601 timestamp when the invitation expires. */
    expiresAt: string;
}
/**
 * Resource for retrieving user profile and storage information.
 *
 * @example
 * ```typescript
 * const user = await client.user.me();
 * console.log(user.email, user.subscriptionTier);
 *
 * const storage = await client.user.getStorage();
 * console.log(`${storage.totalBytes}/${storage.limitBytes} bytes used`);
 * ```
 */
export declare class UserResource {
    private http;
    constructor(http: KyInstance);
    /**
     * Retrieves the current authenticated user's profile.
     *
     * @returns User profile object
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const user = await client.user.me();
     * console.log(user.email, user.subscriptionTier);
     * ```
     */
    me(): Promise<User>;
    /**
     * Retrieves storage usage breakdown for the current user.
     *
     * @returns Storage usage statistics including per-vault breakdown
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const storage = await client.user.getStorage();
     * console.log(`Using ${storage.totalBytes}/${storage.limitBytes} bytes`);
     * storage.vaults.forEach(v => console.log(`${v.name}: ${v.bytes} bytes`));
     * ```
     */
    getStorage(): Promise<StorageUsage>;
    /**
     * Changes the authenticated user's password.
     *
     * @param params - Current and new password
     * @returns Success message
     * @throws {AuthenticationError} If current password is incorrect
     * @throws {ValidationError} If new password fails validation
     */
    changePassword(params: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
    /**
     * Initiates an email address change request. A verification email is sent to the new address.
     *
     * @param params - New email address and current password for verification
     * @returns Success message
     * @throws {AuthenticationError} If password is incorrect
     * @throws {ConflictError} If the new email is already in use
     */
    requestEmailChange(params: {
        newEmail: string;
        password: string;
    }): Promise<{
        message: string;
    }>;
    /**
     * Confirms an email address change using the token sent to the new address.
     *
     * @param token - Verification token from the confirmation email
     * @returns Success message
     * @throws {ValidationError} If the token is invalid or expired
     */
    confirmEmailChange(token: string): Promise<{
        message: string;
    }>;
    /**
     * Updates the authenticated user's profile information.
     *
     * @param params - Fields to update (displayName, avatarUrl, profileSlug, profileBio, and/or profileIsPublic)
     * @returns Success message
     * @throws {ConflictError} If the requested profileSlug is already taken
     * @throws {ValidationError} If the profileSlug format is invalid
     */
    updateProfile(params: {
        displayName?: string;
        avatarUrl?: string | null;
        profileSlug?: string | null;
        profileBio?: string | null;
        profileIsPublic?: boolean;
    }): Promise<{
        message: string;
    }>;
    /**
     * Schedules account deletion. The account is deleted after a grace period.
     *
     * @param params - Password for confirmation, optional deletion reason, and optional data export flag
     * @returns Success message and scheduled deletion timestamp
     * @throws {AuthenticationError} If password is incorrect
     */
    requestAccountDeletion(params: {
        password: string;
        reason?: string;
        exportData?: boolean;
    }): Promise<{
        message: string;
        scheduledAt: string;
    }>;
    /**
     * Cancels a pending account deletion request during the grace period.
     *
     * @returns Success message
     * @throws {NotFoundError} If there is no pending deletion request
     */
    cancelAccountDeletion(): Promise<{
        message: string;
    }>;
    /**
     * Lists all active sessions for the authenticated user.
     *
     * @returns Array of session objects, with the current session marked
     * @throws {AuthenticationError} If not authenticated
     */
    getSessions(): Promise<AccountSession[]>;
    /**
     * Revokes a specific session by ID, logging that session out immediately.
     *
     * @param sessionId - ID of the session to revoke
     * @returns Success message
     * @throws {NotFoundError} If the session does not exist
     */
    revokeSession(sessionId: string): Promise<{
        message: string;
    }>;
    /**
     * Revokes all sessions except the current one, logging out all other devices.
     *
     * @returns Success message
     * @throws {AuthenticationError} If not authenticated
     */
    revokeAllSessions(): Promise<{
        message: string;
    }>;
    /**
     * Requests a full data export of the authenticated user's account.
     *
     * @param format - Export format (defaults to `zip` if omitted)
     * @returns Data export record with status and ID for polling
     * @throws {AuthenticationError} If not authenticated
     */
    requestDataExport(format?: string): Promise<DataExportRecord>;
    /**
     * Retrieves the status of a previously requested data export.
     *
     * @param exportId - ID of the export to look up
     * @returns Data export record including download URL once complete
     * @throws {NotFoundError} If the export does not exist
     */
    getDataExport(exportId: string): Promise<DataExportRecord>;
    /**
     * Lists all data export records for the authenticated user.
     *
     * @returns Array of data export records
     * @throws {AuthenticationError} If not authenticated
     */
    listDataExports(): Promise<DataExportRecord[]>;
    /**
     * Downloads a completed data export file.
     *
     * @param exportId - ID of the export to download
     * @returns The export file as a Blob
     * @throws {NotFoundError} If the export does not exist or is not complete
     * @throws {AuthenticationError} If not authenticated
     */
    downloadDataExport(exportId: string): Promise<Blob>;
    /**
     * Lists all consent records for the authenticated user.
     *
     * @returns Array of consent records (ToS, privacy policy, etc.)
     * @throws {AuthenticationError} If not authenticated
     */
    getConsents(): Promise<ConsentRecord[]>;
    /**
     * Records a consent decision for a specific policy version.
     *
     * @param params - Consent type, version, and whether consent was granted
     * @returns Success message
     * @throws {AuthenticationError} If not authenticated
     */
    recordConsent(params: {
        consentType: string;
        version: string;
        granted: boolean;
    }): Promise<{
        message: string;
    }>;
    /**
     * Lists all pending team invitations for the authenticated user.
     *
     * @returns Array of team invitation inbox items
     * @throws {AuthenticationError} If not authenticated
     */
    listTeamInvitations(): Promise<TeamInvitationInboxItem[]>;
    /**
     * Accepts a pending team invitation, joining the team with the assigned role.
     *
     * @param id - ID of the invitation to accept
     * @returns Success message
     * @throws {NotFoundError} If the invitation does not exist or has expired
     */
    acceptTeamInvitation(id: string): Promise<{
        message: string;
    }>;
    /**
     * Declines a pending team invitation.
     *
     * @param id - ID of the invitation to decline
     * @returns Success message
     * @throws {NotFoundError} If the invitation does not exist or has expired
     */
    declineTeamInvitation(id: string): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=user.d.ts.map