import { handleError } from '../handle-error.js';
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
export class UserResource {
    http;
    constructor(http) {
        this.http = http;
    }
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
    async me() {
        try {
            const data = await this.http.get('users/me').json();
            return data.user;
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
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
    async getStorage() {
        try {
            return await this.http.get('users/me/storage').json();
        }
        catch (error) {
            throw await handleError(error, 'Storage', '');
        }
    }
    /**
     * Changes the authenticated user's password.
     *
     * @param params - Current and new password
     * @returns Success message
     * @throws {AuthenticationError} If current password is incorrect
     * @throws {ValidationError} If new password fails validation
     */
    async changePassword(params) {
        try {
            return await this.http.put('account/password', { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
    /**
     * Initiates an email address change request. A verification email is sent to the new address.
     *
     * @param params - New email address and current password for verification
     * @returns Success message
     * @throws {AuthenticationError} If password is incorrect
     * @throws {ConflictError} If the new email is already in use
     */
    async requestEmailChange(params) {
        try {
            return await this.http.post('account/email', { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
    /**
     * Confirms an email address change using the token sent to the new address.
     *
     * @param token - Verification token from the confirmation email
     * @returns Success message
     * @throws {ValidationError} If the token is invalid or expired
     */
    async confirmEmailChange(token) {
        try {
            return await this.http.post('account/email/verify', { json: { token } }).json();
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
    /**
     * Updates the authenticated user's profile information.
     *
     * @param params - Fields to update (displayName, avatarUrl, profileSlug, profileBio, and/or profileIsPublic)
     * @returns Success message
     * @throws {ConflictError} If the requested profileSlug is already taken
     * @throws {ValidationError} If the profileSlug format is invalid
     */
    async updateProfile(params) {
        try {
            return await this.http.put('account/profile', { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
    /**
     * Schedules account deletion. The account is deleted after a grace period.
     *
     * @param params - Password for confirmation, optional deletion reason, and optional data export flag
     * @returns Success message and scheduled deletion timestamp
     * @throws {AuthenticationError} If password is incorrect
     */
    async requestAccountDeletion(params) {
        try {
            return await this.http
                .post('account/delete', { json: params })
                .json();
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
    /**
     * Cancels a pending account deletion request during the grace period.
     *
     * @returns Success message
     * @throws {NotFoundError} If there is no pending deletion request
     */
    async cancelAccountDeletion() {
        try {
            return await this.http.post('account/delete/cancel').json();
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
    /**
     * Lists all active sessions for the authenticated user.
     *
     * @returns Array of session objects, with the current session marked
     * @throws {AuthenticationError} If not authenticated
     */
    async getSessions() {
        try {
            const data = await this.http.get('account/sessions').json();
            return data.sessions;
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
    /**
     * Revokes a specific session by ID, logging that session out immediately.
     *
     * @param sessionId - ID of the session to revoke
     * @returns Success message
     * @throws {NotFoundError} If the session does not exist
     */
    async revokeSession(sessionId) {
        try {
            return await this.http.delete(`account/sessions/${sessionId}`).json();
        }
        catch (error) {
            throw await handleError(error, 'User', sessionId);
        }
    }
    /**
     * Revokes all sessions except the current one, logging out all other devices.
     *
     * @returns Success message
     * @throws {AuthenticationError} If not authenticated
     */
    async revokeAllSessions() {
        try {
            return await this.http.delete('account/sessions').json();
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
    /**
     * Requests a full data export of the authenticated user's account.
     *
     * @param format - Export format (defaults to `zip` if omitted)
     * @returns Data export record with status and ID for polling
     * @throws {AuthenticationError} If not authenticated
     */
    async requestDataExport(format) {
        try {
            const data = await this.http
                .post('account/export', { json: { format } })
                .json();
            return data.export;
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
    /**
     * Retrieves the status of a previously requested data export.
     *
     * @param exportId - ID of the export to look up
     * @returns Data export record including download URL once complete
     * @throws {NotFoundError} If the export does not exist
     */
    async getDataExport(exportId) {
        try {
            const data = await this.http.get(`account/export/${exportId}`).json();
            return data.export;
        }
        catch (error) {
            throw await handleError(error, 'User', exportId);
        }
    }
    /**
     * Lists all data export records for the authenticated user.
     *
     * @returns Array of data export records
     * @throws {AuthenticationError} If not authenticated
     */
    async listDataExports() {
        try {
            const data = await this.http.get('account/export').json();
            return data.exports;
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
    /**
     * Downloads a completed data export file.
     *
     * @param exportId - ID of the export to download
     * @returns The export file as a Blob
     * @throws {NotFoundError} If the export does not exist or is not complete
     * @throws {AuthenticationError} If not authenticated
     */
    async downloadDataExport(exportId) {
        try {
            return await this.http.get(`account/export/${exportId}/download`).blob();
        }
        catch (error) {
            throw await handleError(error, 'User', exportId);
        }
    }
    /**
     * Lists all consent records for the authenticated user.
     *
     * @returns Array of consent records (ToS, privacy policy, etc.)
     * @throws {AuthenticationError} If not authenticated
     */
    async getConsents() {
        try {
            const data = await this.http.get('account/consents').json();
            const raw = data.consents;
            if (Array.isArray(raw))
                return raw;
            // API returns grouped object: { "terms_of_service": [...], "privacy_policy": [...] }
            return Object.values(raw).flat();
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
    /**
     * Records a consent decision for a specific policy version.
     *
     * @param params - Consent type, version, and whether consent was granted
     * @returns Success message
     * @throws {AuthenticationError} If not authenticated
     */
    async recordConsent(params) {
        try {
            return await this.http.post('account/consents', { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
    /**
     * Lists all pending team invitations for the authenticated user.
     *
     * @returns Array of team invitation inbox items
     * @throws {AuthenticationError} If not authenticated
     */
    async listTeamInvitations() {
        try {
            const data = await this.http
                .get('users/me/invitations')
                .json();
            return data.invitations;
        }
        catch (error) {
            throw await handleError(error, 'User', '');
        }
    }
    /**
     * Accepts a pending team invitation, joining the team with the assigned role.
     *
     * @param id - ID of the invitation to accept
     * @returns Success message
     * @throws {NotFoundError} If the invitation does not exist or has expired
     */
    async acceptTeamInvitation(id) {
        try {
            return await this.http.post(`users/me/invitations/${id}/accept`).json();
        }
        catch (error) {
            throw await handleError(error, 'User', id);
        }
    }
    /**
     * Declines a pending team invitation.
     *
     * @param id - ID of the invitation to decline
     * @returns Success message
     * @throws {NotFoundError} If the invitation does not exist or has expired
     */
    async declineTeamInvitation(id) {
        try {
            return await this.http.post(`users/me/invitations/${id}/decline`).json();
        }
        catch (error) {
            throw await handleError(error, 'User', id);
        }
    }
}
//# sourceMappingURL=user.js.map