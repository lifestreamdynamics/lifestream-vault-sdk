import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

/** A share link for a document. */
export interface ShareLink {
  /** Unique share link identifier. */
  id: string;
  /** ID of the shared document. */
  documentId: string;
  /** ID of the vault containing the document. */
  vaultId: string;
  /** ID of the user who created the share link. */
  createdBy: string;
  /** First 8 characters of the share token (for identification). */
  tokenPrefix: string;
  /** Permission level granted by this link. */
  permission: 'view' | 'edit';
  /** ISO 8601 expiration timestamp, or `null` if the link never expires. */
  expiresAt: string | null;
  /** Maximum number of views allowed, or `null` for unlimited. */
  maxViews: number | null;
  /** Number of times the link has been viewed. */
  viewCount: number;
  /** Whether the share link is currently active. */
  isActive: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/** Parameters for creating a new share link. */
export interface CreateShareLinkParams {
  /** Permission level: `'view'` (default) or `'edit'`. */
  permission?: 'view' | 'edit';
  /** Optional password to protect the share link (min 4, max 128 chars). */
  password?: string;
  /** Optional ISO 8601 expiration date. */
  expiresAt?: string;
  /** Optional maximum number of views before the link expires. */
  maxViews?: number;
}

/** Response from creating a share link, including the full token (shown only once). */
export interface CreateShareLinkResponse {
  /** The created share link metadata. */
  shareLink: ShareLink;
  /** The full share token. Only returned at creation time; cannot be retrieved later. */
  fullToken: string;
}

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
  constructor(private http: KyInstance) {}

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
  async list(vaultId: string, documentPath: string): Promise<ShareLink[]> {
    try {
      const data = await this.http
        .get(`vaults/${vaultId}/shares/document/${documentPath}`)
        .json<{ shareLinks: ShareLink[] }>();
      return data.shareLinks;
    } catch (error) {
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
  async create(
    vaultId: string,
    documentPath: string,
    params: CreateShareLinkParams = {},
  ): Promise<CreateShareLinkResponse> {
    try {
      return await this.http
        .post(`vaults/${vaultId}/shares/document/${documentPath}`, { json: params })
        .json();
    } catch (error) {
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
  async revoke(vaultId: string, shareId: string): Promise<void> {
    try {
      await this.http.delete(`vaults/${vaultId}/shares/${shareId}`);
    } catch (error) {
      throw await handleError(error, 'Share Link', shareId);
    }
  }
}
