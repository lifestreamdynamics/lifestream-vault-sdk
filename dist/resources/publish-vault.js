import { handleError } from '../handle-error.js';
/**
 * Resource for managing whole-vault publishing (multi-document public sites).
 *
 * Allows publishing an entire vault as a public documentation site at a
 * custom slug or domain, with configurable sidebar and search options.
 *
 * @example
 * ```typescript
 * const site = await client.publishVault.publish('vault-uuid', {
 *   slug: 'my-docs',
 *   title: 'My Documentation',
 * });
 * console.log(`Published at: https://vault.lifestreamdynamics.com/p/${site.slug}`);
 * ```
 */
export class PublishVaultResource {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Lists all published vaults owned by the authenticated user.
     *
     * @returns Array of published vault objects
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async listMine() {
        try {
            const data = await this.http.get('publish-vault/my').json();
            return data.publishedVaults;
        }
        catch (error) {
            throw await handleError(error, 'PublishedVault', '');
        }
    }
    /**
     * Publishes a vault as a public multi-document site.
     *
     * @param vaultId - The ID of the vault to publish
     * @param params - Publishing configuration (slug, title, options)
     * @returns The created published vault record
     * @throws {NotFoundError} If the vault does not exist
     * @throws {ConflictError} If the slug is already in use
     * @throws {ValidationError} If the parameters are invalid
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async publish(vaultId, params) {
        try {
            const data = await this.http.post(`vaults/${vaultId}/publish-vault`, { json: params }).json();
            return data.publishedVault;
        }
        catch (error) {
            throw await handleError(error, 'PublishedVault', vaultId);
        }
    }
    /**
     * Updates the configuration of an already-published vault.
     *
     * Only the provided fields are modified; omitted fields remain unchanged.
     *
     * @param vaultId - The ID of the vault whose published site to update
     * @param params - Fields to update (all optional)
     * @returns The updated published vault record
     * @throws {NotFoundError} If the vault or its published site does not exist
     * @throws {ConflictError} If the new slug is already in use
     * @throws {ValidationError} If the parameters are invalid
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async update(vaultId, params) {
        try {
            const data = await this.http.put(`vaults/${vaultId}/publish-vault`, { json: params }).json();
            return data.publishedVault;
        }
        catch (error) {
            throw await handleError(error, 'PublishedVault', vaultId);
        }
    }
    /**
     * Unpublishes a vault, making it no longer publicly accessible.
     *
     * @param vaultId - The ID of the vault to unpublish
     * @throws {NotFoundError} If the vault or its published site does not exist
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async unpublish(vaultId) {
        try {
            await this.http.delete(`vaults/${vaultId}/publish-vault`);
        }
        catch (error) {
            throw await handleError(error, 'PublishedVault', vaultId);
        }
    }
}
//# sourceMappingURL=publish-vault.js.map