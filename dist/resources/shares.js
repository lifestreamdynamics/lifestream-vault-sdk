import { handleError } from '../handle-error.js';
import { ensureArray } from '../utils/ensure-array.js';
/**
 * Resource for managing document share links.
 *
 * Share links provide token-based access to documents with optional password
 * protection, expiration dates, and view limits. Links can grant either
 * read-only (`view`) or read-write (`edit`) access.
 *
 * @example
 * ```typescript
 * // Create a view-only share link that expires in 7 days
 * const result = await client.shares.create('vault-id', 'notes/meeting.md', {
 *   permission: 'view',
 *   expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
 * });
 * console.log('Share URL token:', result.fullToken);
 * ```
 */
export class SharesResource {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Lists all share links for a specific document.
     *
     * @param vaultId - The vault ID containing the document
     * @param documentPath - File path of the document (e.g., `'notes/meeting.md'`)
     * @returns Array of share link objects for the document
     * @throws {NotFoundError} If the vault or document does not exist
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const links = await client.shares.list('vault-id', 'notes/meeting.md');
     * for (const link of links) {
     *   console.log(`${link.tokenPrefix}... (${link.permission}, views: ${link.viewCount})`);
     * }
     * ```
     */
    async list(vaultId, documentPath) {
        try {
            const data = await this.http
                .get(`vaults/${vaultId}/shares/document/${documentPath}`)
                .json();
            return ensureArray(data.shareLinks);
        }
        catch (error) {
            throw await handleError(error, 'Share Links', documentPath);
        }
    }
    /**
     * Creates a new share link for a document.
     *
     * The `fullToken` in the response is only returned at creation time and
     * cannot be retrieved later. Store it securely or share it immediately.
     *
     * @param vaultId - The vault ID containing the document
     * @param documentPath - File path of the document to share
     * @param params - Optional share link parameters (permission, password, expiry, max views)
     * @returns The created share link and its full token
     * @throws {NotFoundError} If the vault or document does not exist
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {ValidationError} If the parameters are invalid
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * // Create a password-protected link with a view limit
     * const result = await client.shares.create('vault-id', 'notes/secret.md', {
     *   permission: 'view',
     *   password: 'secure-password',
     *   maxViews: 10,
     * });
     * console.log('Token:', result.fullToken);
     * ```
     */
    async create(vaultId, documentPath, params = {}) {
        try {
            return await this.http
                .post(`vaults/${vaultId}/shares/document/${documentPath}`, { json: params })
                .json();
        }
        catch (error) {
            throw await handleError(error, 'Share Link', documentPath);
        }
    }
    /**
     * Revokes (deactivates) a share link.
     *
     * Once revoked, the share link can no longer be used to access the document.
     * This action is irreversible.
     *
     * @param vaultId - The vault ID containing the shared document
     * @param shareId - The unique identifier of the share link to revoke
     * @throws {NotFoundError} If the share link does not exist
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * await client.shares.revoke('vault-id', 'share-link-id');
     * ```
     */
    async revoke(vaultId, shareId) {
        try {
            await this.http.delete(`vaults/${vaultId}/shares/${shareId}`);
        }
        catch (error) {
            throw await handleError(error, 'Share Link', shareId);
        }
    }
}
//# sourceMappingURL=shares.js.map