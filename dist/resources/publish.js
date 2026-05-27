import { handleError } from '../handle-error.js';
import { ensureArray } from '../utils/ensure-array.js';
/**
 * Resource for managing document publishing.
 *
 * Published documents are publicly accessible at `/:profileSlug/:docSlug`
 * with optional SEO metadata. Requires a `pro` or higher subscription tier
 * with the `publishing` feature enabled.
 *
 * @example
 * ```typescript
 * const published = await client.publish.create('vault-id', 'blog/first-post.md', {
 *   slug: 'my-first-post',
 *   seoTitle: 'My First Post',
 *   seoDescription: 'An introduction to my vault.',
 * });
 * console.log(`Published at: /${published.publishedBy}/${published.slug}`);
 * ```
 */
export class PublishResource {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Lists all published documents for the authenticated user.
     *
     * Returns documents across all vaults, including document path and title
     * metadata. Does not require vault-level access.
     *
     * @param vaultId - A vault ID (required by the route but not filtered on)
     * @returns Array of published document objects with source document metadata
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const docs = await client.publish.listMine('any-vault-id');
     * for (const doc of docs) {
     *   console.log(`${doc.slug} -> ${doc.documentPath} (published: ${doc.isPublished})`);
     * }
     * ```
     */
    async listMine(vaultId) {
        try {
            const data = await this.http
                .get(`vaults/${vaultId}/publish/my`)
                .json();
            return ensureArray(data.publishedDocs);
        }
        catch (error) {
            throw await handleError(error, 'Published Documents', '');
        }
    }
    /**
     * Publishes a document, making it publicly accessible.
     *
     * If the document is already published, this updates its publish settings
     * (acts as an upsert).
     *
     * @param vaultId - The vault ID containing the document
     * @param documentPath - File path of the document to publish
     * @param params - Publish parameters including slug and optional SEO metadata
     * @returns The published document metadata
     * @throws {NotFoundError} If the vault or document does not exist
     * @throws {ConflictError} If the slug is already in use
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user's subscription does not include publishing
     * @throws {ValidationError} If the parameters are invalid
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const pub = await client.publish.create('vault-id', 'blog/post.md', {
     *   slug: 'my-post',
     *   seoTitle: 'My Blog Post',
     * });
     * console.log(`Published: ${pub.slug}`);
     * ```
     */
    async create(vaultId, documentPath, params) {
        try {
            const data = await this.http
                .post(`vaults/${vaultId}/publish/document/${documentPath}`, { json: params })
                .json();
            return data.publishedDoc;
        }
        catch (error) {
            throw await handleError(error, 'Published Document', documentPath);
        }
    }
    /**
     * Updates the publish settings of an already-published document.
     *
     * @param vaultId - The vault ID containing the document
     * @param documentPath - File path of the published document
     * @param params - Updated publish parameters (slug is required)
     * @returns The updated published document metadata
     * @throws {NotFoundError} If the vault or document does not exist
     * @throws {ConflictError} If the new slug is already in use
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user's subscription does not include publishing
     * @throws {ValidationError} If the parameters are invalid
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const updated = await client.publish.update('vault-id', 'blog/post.md', {
     *   slug: 'updated-slug',
     *   seoDescription: 'Updated description for SEO.',
     * });
     * ```
     */
    async update(vaultId, documentPath, params) {
        try {
            const data = await this.http
                .put(`vaults/${vaultId}/publish/document/${documentPath}`, { json: params })
                .json();
            return data.publishedDoc;
        }
        catch (error) {
            throw await handleError(error, 'Published Document', documentPath);
        }
    }
    /**
     * Unpublishes a document, removing it from public access.
     *
     * The document itself is not deleted; only the published state is changed.
     *
     * @param vaultId - The vault ID containing the document
     * @param documentPath - File path of the document to unpublish
     * @throws {NotFoundError} If the published document does not exist
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user's subscription does not include publishing
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * await client.publish.delete('vault-id', 'blog/post.md');
     * ```
     */
    async delete(vaultId, documentPath) {
        try {
            await this.http.delete(`vaults/${vaultId}/publish/document/${documentPath}`);
        }
        catch (error) {
            throw await handleError(error, 'Published Document', documentPath);
        }
    }
    async getSubdomain(vaultId) {
        try {
            return await this.http.get(`vaults/${vaultId}/publish/subdomain`).json();
        }
        catch (error) {
            throw await handleError(error, 'Publish', vaultId);
        }
    }
    async setSubdomain(vaultId, subdomain) {
        try {
            return await this.http.put(`vaults/${vaultId}/publish/subdomain`, { json: { subdomain } }).json();
        }
        catch (error) {
            throw await handleError(error, 'Publish', vaultId);
        }
    }
    async deleteSubdomain(vaultId) {
        try {
            return await this.http.delete(`vaults/${vaultId}/publish/subdomain`).json();
        }
        catch (error) {
            throw await handleError(error, 'Publish', vaultId);
        }
    }
}
//# sourceMappingURL=publish.js.map