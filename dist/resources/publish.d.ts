import type { KyInstance } from 'ky';
/** A published document with SEO metadata. */
export interface PublishedDocument {
    /** Unique published document identifier. */
    id: string;
    /** ID of the source document. */
    documentId: string;
    /** ID of the vault containing the document. */
    vaultId: string;
    /** ID of the user who published the document. */
    publishedBy: string;
    /** URL-friendly slug for the published page. */
    slug: string;
    /** SEO title for the published page, or `null` if not set. */
    seoTitle: string | null;
    /** SEO description for the published page, or `null` if not set. */
    seoDescription: string | null;
    /** Open Graph image URL, or `null` if not set. */
    ogImage: string | null;
    /** Whether the document is currently published. */
    isPublished: boolean;
    /** ISO 8601 timestamp when the document was first published. */
    publishedAt: string;
    /** ISO 8601 timestamp of the last update to publish settings. */
    updatedAt: string;
}
/** A published document with additional document metadata (returned by `listMine`). */
export interface PublishedDocumentWithMeta extends PublishedDocument {
    /** File path of the source document. */
    documentPath: string;
    /** Title of the source document, or `null` if not set. */
    documentTitle: string | null;
}
/** Parameters for publishing a document. */
export interface PublishDocumentParams {
    /** URL-friendly slug (lowercase alphanumeric with hyphens). */
    slug: string;
    /** Optional SEO title (max 200 chars). */
    seoTitle?: string;
    /** Optional SEO description (max 500 chars). */
    seoDescription?: string;
    /** Optional Open Graph image URL. */
    ogImage?: string;
}
/** Parameters for updating a published document. */
export interface UpdatePublishParams {
    /** New slug (required for updates). */
    slug: string;
    /** Updated SEO title, or `null` to clear. */
    seoTitle?: string | null;
    /** Updated SEO description, or `null` to clear. */
    seoDescription?: string | null;
    /** Updated Open Graph image URL, or `null` to clear. */
    ogImage?: string | null;
}
export interface PublishSubdomain {
    subdomain: string | null;
}
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
export declare class PublishResource {
    private http;
    constructor(http: KyInstance);
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
    listMine(vaultId: string): Promise<PublishedDocumentWithMeta[]>;
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
    create(vaultId: string, documentPath: string, params: PublishDocumentParams): Promise<PublishedDocument>;
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
    update(vaultId: string, documentPath: string, params: UpdatePublishParams): Promise<PublishedDocument>;
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
    delete(vaultId: string, documentPath: string): Promise<void>;
    getSubdomain(vaultId: string): Promise<PublishSubdomain>;
    setSubdomain(vaultId: string, subdomain: string): Promise<PublishSubdomain>;
    deleteSubdomain(vaultId: string): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=publish.d.ts.map