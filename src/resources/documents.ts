import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';
import {
  SDKError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from '../errors.js';
import { encrypt, decrypt } from '../lib/encryption.js';

/** Metadata for a document stored in a vault. */
export interface Document {
  /** Unique document identifier. */
  id: string;
  /** ID of the vault containing this document. */
  vaultId: string;
  /** File path relative to the vault root (e.g., `'notes/todo.md'`). */
  path: string;
  /** Document title extracted from frontmatter or first heading, if available. */
  title: string | null;
  /** SHA-256 hash of the document content. */
  contentHash: string;
  /** Document size in bytes. */
  sizeBytes: number;
  /** Tags extracted from frontmatter and inline hashtags. */
  tags: string[];
  /** Whether the document content is encrypted client-side. */
  encrypted: boolean;
  /** The encryption algorithm used, if encrypted. */
  encryptionAlgorithm: string | null;
  /** ISO 8601 timestamp of the last file modification. */
  fileModifiedAt: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string;
}

/** A document with its full Markdown content. */
export interface DocumentWithContent {
  /** Document metadata. */
  document: Document;
  /** Raw Markdown content of the document. */
  content: string;
}

/** Options for {@link DocumentsResource.get}. */
export interface DocumentGetOptions {
  /**
   * Conditional GET. If the document's current ETag matches this value the
   * server returns 304 Not Modified and the SDK returns
   * `{ notModified: true }` instead of the full body. Use the `etag` returned
   * from a prior {@link DocumentsResource.get} call.
   */
  ifNoneMatch?: string;
}

/**
 * Options for {@link DocumentsResource.list}.
 * When `ifNoneMatch` is provided the request becomes conditional and the return
 * type changes to `DocumentListResult` (the discriminated union).
 */
export interface DocumentListOptions {
  /** Maximum number of documents to return. */
  limit?: number;
  /** Number of documents to skip (for pagination). */
  offset?: number;
  /** Filter to documents that carry all of the specified tags. */
  tags?: string[];
  /**
   * Conditional LIST. Supply the `etag` returned by a previous conditional
   * list call. When the server answers 304 Not Modified the SDK returns
   * `{ notModified: true }` without a document body. Pass an empty string
   * (`''`) for the first call — the server will treat it as a non-match,
   * return 200 with a real ETag, and the result bootstraps subsequent calls.
   */
  ifNoneMatch?: string;
}

/**
 * Result of a conditional {@link DocumentsResource.list} when the server
 * answered 304 Not Modified. The caller's cached document list is still current.
 */
export interface DocumentListNotModified {
  notModified: true;
  /** The ETag that was sent — confirmed still current by the server. */
  etag: string;
}

/**
 * Result of {@link DocumentsResource.list} when the document list was
 * returned. The `etag` is suitable for re-use as `ifNoneMatch` on the next
 * call.
 */
export interface DocumentListFetched {
  notModified: false;
  /** Weak ETag for the returned list (RFC 7232). Empty string if the server
   * does not support list ETags (old server). */
  etag: string;
  /** The documents in the list. */
  documents: DocumentListItem[];
}

/** Discriminated union returned by conditional list calls. */
export type DocumentListResult = DocumentListFetched | DocumentListNotModified;

/**
 * The caller's known state of a vault, used by {@link DocumentsResource.syncList}
 * to detect changes without fetching every document body.
 */
export interface SyncListKnownState {
  /** Map of document path → SHA-256 hex hash the client already has. */
  hashes: Record<string, string>;
  /** ETag from a previous {@link DocumentsResource.syncList} call, if any. */
  listEtag?: string;
}

/** A single document that has been added or changed on the server. */
export interface SyncListChange {
  /** File path relative to vault root. */
  path: string;
  /** SHA-256 hex digest of the current server-side content. */
  contentHash: string;
  /** ISO 8601 timestamp of the last file modification on the server. */
  fileModifiedAt: string;
  /** Whether this document is new to the client (`'added'`) or has a
   * different hash from the client's cached version (`'changed'`). */
  kind: 'added' | 'changed';
}

/** Result of {@link DocumentsResource.syncList}. */
export interface SyncListResult {
  /** Documents that are new or have changed since the client's last known state. */
  changes: SyncListChange[];
  /** Paths that were in the client's known state but are no longer on the server. */
  removed: string[];
  /** Paths whose content hash matches the client's known state exactly. */
  unchanged: string[];
  /** The list ETag from this response, to be stored and passed back on the
   * next call as `knownState.listEtag`. Empty string if the server does not
   * support list ETags. */
  listEtag: string;
  /**
   * `true` when the server 304'd the list request, meaning the vault is
   * completely unchanged since the last call. When `true`, all other fields
   * are trivially derived from `knownState` (changes and removed are empty,
   * unchanged contains every known path).
   */
  vaultUnchanged: boolean;
}

/**
 * Result of a conditional {@link DocumentsResource.get} when the server
 * answered 304 Not Modified. The caller's cached copy is still current.
 */
export interface DocumentNotModified {
  notModified: true;
  /** The ETag that was sent — confirmed still current by the server. */
  etag: string;
}

/**
 * Result of {@link DocumentsResource.get} when the document body was
 * returned. The `etag` is suitable for re-use as `ifNoneMatch` on the next
 * call.
 */
export interface DocumentFetched extends DocumentWithContent {
  notModified: false;
  /** Strong ETag for the returned content (RFC 7232, quote-wrapped). */
  etag: string;
}

/** Discriminated union returned by conditional gets. */
export type DocumentGetResult = DocumentFetched | DocumentNotModified;

/** Version metadata for a document. */
export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNum: number;
  contentHash: string;
  sizeBytes: number;
  changeSource: 'web' | 'api' | 'webdav';
  changedBy: string | null;
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
}

/** Version with its content. */
export interface DocumentVersionWithContent extends DocumentVersion {
  content: string | null;
}

/** Diff response between two versions. */
export interface VersionDiffResponse {
  fromVersion: number;
  toVersion: number;
  changes: Array<{
    added?: boolean;
    removed?: boolean;
    value: string;
  }>;
}

/** Forward link from a document to another. */
export interface ForwardLinkResult {
  id: string;
  targetPath: string;
  linkText: string;
  isResolved: boolean;
  targetDocument: { id: string; path: string; title: string | null } | null;
}

/** Backlink pointing to a document from another. */
export interface BacklinkResult {
  id: string;
  sourceDocumentId: string;
  linkText: string;
  contextSnippet: string | null;
  sourceDocument: { id: string; path: string; title: string | null };
}

/** Summary information for a document in a listing. */
export interface DocumentListItem {
  /** Unique document identifier. */
  id: string;
  /** File path relative to the vault root. */
  path: string;
  /** Document title, if available. */
  title: string | null;
  /** Tags extracted from the document. */
  tags: string[];
  /** Document size in bytes. */
  sizeBytes: number;
  /** ISO 8601 timestamp of the last file modification. */
  fileModifiedAt: string;
  /**
   * SHA-256 hex digest of the document body. Lets sync clients short-circuit
   * unchanged docs without a per-doc GET round trip.
   */
  contentHash: string;
}

/** Result of a bulk operation on multiple documents. */
export interface BulkOperationResult {
  succeeded: string[];
  failed: Array<{ path: string; error: string }>;
}

/**
 * Resource for managing documents within vaults.
 *
 * Documents are Markdown files stored in vaults. Each document has a file
 * path relative to the vault root and must end with `.md`. The API supports
 * CRUD operations as well as move and copy.
 *
 * @example
 * ```typescript
 * const docs = await client.documents.list('vault-uuid');
 * const doc = await client.documents.get('vault-uuid', 'notes/todo.md');
 * console.log(doc.content);
 * ```
 */
export class DocumentsResource {
  constructor(private http: KyInstance) {}

  /**
   * Lists documents in a vault, optionally filtered by directory.
   *
   * **Unconditional form** — returns an array directly (backward-compatible):
   * ```typescript
   * const docs = await client.documents.list('vault-uuid');
   * const notes = await client.documents.list('vault-uuid', 'notes/');
   * ```
   *
   * **Conditional form** — supply `ifNoneMatch` to get a discriminated-union
   * result that lets you skip processing when the vault is unchanged:
   * ```typescript
   * // Bootstrap: pass empty string on first call.
   * const result = await client.documents.list('vault-uuid', undefined, { ifNoneMatch: '' });
   * if (!result.notModified) {
   *   // result.documents is available; store result.etag for the next call.
   * }
   * ```
   *
   * @param vaultId - The vault ID to list documents from
   * @param dirPath - Optional directory path to filter results (e.g., `'notes/'`)
   * @param options - Optional query/conditional parameters
   * @throws {NotFoundError} If the vault does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async list(vaultId: string, dirPath?: string): Promise<DocumentListItem[]>;
  async list(
    vaultId: string,
    dirPath: string | undefined,
    options: Omit<DocumentListOptions, 'ifNoneMatch'> & { ifNoneMatch?: undefined },
  ): Promise<DocumentListItem[]>;
  async list(
    vaultId: string,
    dirPath: string | undefined,
    options: DocumentListOptions & { ifNoneMatch: string },
  ): Promise<DocumentListResult>;
  async list(
    vaultId: string,
    dirPath?: string,
    options?: DocumentListOptions,
  ): Promise<DocumentListItem[] | DocumentListResult> {
    const searchParams: Record<string, string | number> = {};
    if (dirPath) searchParams.dir = dirPath;
    if (options?.limit !== undefined) searchParams.limit = options.limit;
    if (options?.offset !== undefined) searchParams.offset = options.offset;
    if (options?.tags && options.tags.length > 0) searchParams.tags = options.tags.join(',');

    // Unconditional path — backward-compatible, returns array directly.
    if (options?.ifNoneMatch === undefined) {
      try {
        const data = await this.http
          .get(`vaults/${vaultId}/documents`, { searchParams })
          .json<{ documents: DocumentListItem[] }>();
        return data.documents;
      } catch (error) {
        throw await handleError(error, 'Documents', vaultId);
      }
    }

    // Conditional path. Disable ky's default throw-on-non-2xx so we can
    // inspect a 304 response — ky treats 3xx as errors by default.
    try {
      const response = await this.http.get(`vaults/${vaultId}/documents`, {
        searchParams,
        headers: { 'If-None-Match': options.ifNoneMatch },
        throwHttpErrors: false,
      });
      const etag = response.headers.get('etag') ?? '';
      if (response.status === 304) {
        return { notModified: true, etag: etag || options.ifNoneMatch };
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string; details?: unknown };
        const msg = body.message ?? `HTTP ${response.status}`;
        if (response.status === 400) throw new ValidationError(msg, body.details);
        if (response.status === 401) throw new AuthenticationError(msg);
        if (response.status === 403) throw new AuthorizationError(msg);
        if (response.status === 404) throw new NotFoundError('Vault', vaultId);
        if (response.status === 409) throw new ConflictError(msg);
        if (response.status === 429) throw new RateLimitError(msg);
        throw new SDKError(msg, response.status);
      }
      const body = await response.json<{ documents: DocumentListItem[] }>();
      return { notModified: false, etag, documents: body.documents };
    } catch (error) {
      if (error instanceof SDKError) throw error;
      throw await handleError(error, 'Documents', vaultId);
    }
  }

  /**
   * High-level helper for efficient vault sync. Calls the conditional LIST
   * endpoint and classifies each document as added, changed, or unchanged
   * relative to `knownState`. Removed documents (present in `knownState` but
   * absent from the server response) are reported separately.
   *
   * In steady state (vault unchanged), this issues a single HTTP request that
   * returns 304 — zero body bytes transferred and zero per-document GETs
   * required.
   *
   * Old-server compatibility: when the server does not support list ETags it
   * ignores `If-None-Match` and returns 200 with no `etag` header. The SDK
   * handles this gracefully (`listEtag` will be an empty string; `vaultUnchanged`
   * will be `false`). The next call will pass an empty `ifNoneMatch` again,
   * which is safe — the server just always returns the full list.
   *
   * @param vaultId - The vault ID to sync
   * @param knownState - The client's last-known document hashes and list ETag
   * @param options - Optional directory and tag filters
   *
   * @example
   * ```typescript
   * let state: SyncListKnownState = { hashes: {} };
   *
   * // Every poll cycle:
   * const result = await client.documents.syncList('vault-uuid', state);
   * if (result.vaultUnchanged) {
   *   console.log('Nothing to do');
   * } else {
   *   for (const change of result.changes) {
   *     const doc = await client.documents.get('vault-uuid', change.path);
   *     // … apply change locally …
   *   }
   *   for (const path of result.removed) {
   *     // … delete locally …
   *   }
   *   // Persist the new state for the next poll.
   *   state = {
   *     hashes: Object.fromEntries(
   *       [...result.changes, ...result.unchanged.map(p => ({
   *         path: p,
   *         contentHash: state.hashes[p],
   *       }))].map(c => [c.path, c.contentHash ?? state.hashes[c.path]]),
   *     ),
   *     listEtag: result.listEtag,
   *   };
   * }
   * ```
   */
  async syncList(
    vaultId: string,
    knownState: SyncListKnownState,
    options?: { dirPath?: string; tags?: string[] },
  ): Promise<SyncListResult> {
    const result = await this.list(vaultId, options?.dirPath, {
      tags: options?.tags,
      ifNoneMatch: knownState.listEtag ?? '',
    });

    if (result.notModified) {
      return {
        changes: [],
        removed: [],
        unchanged: Object.keys(knownState.hashes),
        listEtag: result.etag,
        vaultUnchanged: true,
      };
    }

    // result is DocumentListFetched
    const remotePathSet = new Set(result.documents.map((d) => d.path));

    const changes: SyncListChange[] = [];
    const unchanged: string[] = [];

    for (const doc of result.documents) {
      const knownHash = knownState.hashes[doc.path];
      if (knownHash === undefined) {
        changes.push({ path: doc.path, contentHash: doc.contentHash, fileModifiedAt: doc.fileModifiedAt, kind: 'added' });
      } else if (knownHash !== doc.contentHash) {
        changes.push({ path: doc.path, contentHash: doc.contentHash, fileModifiedAt: doc.fileModifiedAt, kind: 'changed' });
      } else {
        unchanged.push(doc.path);
      }
    }

    const removed = Object.keys(knownState.hashes).filter((p) => !remotePathSet.has(p));

    return {
      changes,
      removed,
      unchanged,
      listEtag: result.etag,
      vaultUnchanged: false,
    };
  }

  /**
   * Retrieves a document's metadata and full Markdown content.
   *
   * @param vaultId - The vault ID containing the document
   * @param docPath - File path relative to vault root (e.g., `'notes/todo.md'`)
   * @returns The document metadata and raw Markdown content
   * @throws {NotFoundError} If the vault or document does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const { document, content } = await client.documents.get(
   *   'vault-uuid',
   *   'notes/todo.md'
   * );
   * console.log(document.title, content);
   * ```
   */
  async get(vaultId: string, docPath: string): Promise<DocumentWithContent>;
  async get(vaultId: string, docPath: string, options: DocumentGetOptions): Promise<DocumentGetResult>;
  async get(
    vaultId: string,
    docPath: string,
    options?: DocumentGetOptions,
  ): Promise<DocumentWithContent | DocumentGetResult> {
    if (options?.ifNoneMatch === undefined) {
      try {
        return await this.http.get(`vaults/${vaultId}/documents/${docPath}`).json<DocumentWithContent>();
      } catch (error) {
        throw await handleError(error, 'Document', docPath);
      }
    }

    // Conditional GET path. Disable ky's default throw-on-non-2xx for this
    // call so we can inspect a 304 response — ky treats 3xx as errors by
    // default. We branch on status manually for 304 / 200 / error.
    try {
      const response = await this.http.get(`vaults/${vaultId}/documents/${docPath}`, {
        headers: { 'If-None-Match': options.ifNoneMatch },
        throwHttpErrors: false,
      });
      const etag = response.headers.get('etag') ?? '';
      if (response.status === 304) {
        return { notModified: true, etag: etag || options.ifNoneMatch };
      }
      if (!response.ok) {
        // 4xx/5xx: throw the typed SDK error directly, mirroring handleError's
        // status-to-error mapping. We can't synthesise a real ky HTTPError
        // (its constructor demands a Request we don't have), so we map here.
        const body = (await response.json().catch(() => ({}))) as { message?: string; details?: unknown };
        const msg = body.message ?? `HTTP ${response.status}`;
        if (response.status === 400) throw new ValidationError(msg, body.details);
        if (response.status === 401) throw new AuthenticationError(msg);
        if (response.status === 403) throw new AuthorizationError(msg);
        if (response.status === 404) throw new NotFoundError('Document', docPath);
        if (response.status === 409) throw new ConflictError(msg);
        if (response.status === 429) throw new RateLimitError(msg);
        throw new SDKError(msg, response.status);
      }
      const body = await response.json<DocumentWithContent>();
      return { notModified: false, etag, ...body };
    } catch (error) {
      // If we already threw a typed SDK error above, surface it as-is.
      if (error instanceof SDKError) throw error;
      throw await handleError(error, 'Document', docPath);
    }
  }

  /**
   * Creates or updates a document (upsert).
   *
   * If a document already exists at the given path, it is updated only when
   * the content has changed (compared by SHA-256 hash). Intermediate folders
   * are created automatically.
   *
   * @param vaultId - The vault ID to write the document into
   * @param docPath - File path relative to vault root (must end with `.md`)
   * @param content - Raw Markdown content to write
   * @returns The created or updated document metadata
   * @throws {NotFoundError} If the vault does not exist
   * @throws {ValidationError} If the path is invalid or content exceeds size limits
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * // Create a new document
   * const doc = await client.documents.put(
   *   'vault-uuid',
   *   'notes/hello.md',
   *   '# Hello World\n\nThis is my first note.'
   * );
   * ```
   *
   * @example
   * ```typescript
   * // Update an existing document
   * const { content } = await client.documents.get('vault-uuid', 'notes/hello.md');
   * await client.documents.put(
   *   'vault-uuid',
   *   'notes/hello.md',
   *   content + '\n\nAppended text.'
   * );
   * ```
   */
  async put(vaultId: string, docPath: string, content: string): Promise<Document> {
    try {
      return await this.http.put(`vaults/${vaultId}/documents/${docPath}`, {
        json: { content },
      }).json<Document>();
    } catch (error) {
      throw await handleError(error, 'Document', docPath);
    }
  }

  /**
   * Permanently deletes a document from a vault.
   *
   * Removes the document from both the filesystem and the database.
   * This action is irreversible.
   *
   * @param vaultId - The vault ID containing the document
   * @param docPath - File path of the document to delete
   * @throws {NotFoundError} If the vault or document does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * await client.documents.delete('vault-uuid', 'notes/old-note.md');
   * ```
   */
  async delete(vaultId: string, docPath: string): Promise<void> {
    try {
      await this.http.delete(`vaults/${vaultId}/documents/${docPath}`);
    } catch (error) {
      throw await handleError(error, 'Document', docPath);
    }
  }

  /**
   * Moves (renames) a document to a new path within the same vault.
   *
   * @param vaultId - The vault ID containing the document
   * @param sourcePath - Current file path of the document
   * @param destination - New file path for the document (must end with `.md`)
   * @param overwrite - If `true`, overwrite any existing document at the destination. Defaults to `false`.
   * @returns Object with a confirmation message and the source/destination paths
   * @throws {NotFoundError} If the vault or source document does not exist
   * @throws {ConflictError} If a document exists at the destination and `overwrite` is `false`
   * @throws {ValidationError} If the destination path is invalid
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const result = await client.documents.move(
   *   'vault-uuid',
   *   'drafts/note.md',
   *   'published/note.md'
   * );
   * console.log(result.destination); // 'published/note.md'
   * ```
   *
   * @see {@link DocumentsResource.copy} to duplicate a document instead
   */
  async move(vaultId: string, sourcePath: string, destination: string, overwrite?: boolean): Promise<{ message: string; source: string; destination: string }> {
    try {
      return await this.http.post(`vaults/${vaultId}/documents/${sourcePath}/move`, {
        json: { destination, overwrite },
      }).json<{ message: string; source: string; destination: string }>();
    } catch (error) {
      throw await handleError(error, 'Document', sourcePath);
    }
  }

  /**
   * Copies a document to a new path within the same vault.
   *
   * The original document is preserved. A new document is created at the
   * destination path with the same content.
   *
   * @param vaultId - The vault ID containing the document
   * @param sourcePath - File path of the document to copy
   * @param destination - File path for the new copy (must end with `.md`)
   * @param overwrite - If `true`, overwrite any existing document at the destination. Defaults to `false`.
   * @returns Object with a confirmation message and the source/destination paths
   * @throws {NotFoundError} If the vault or source document does not exist
   * @throws {ConflictError} If a document exists at the destination and `overwrite` is `false`
   * @throws {ValidationError} If the destination path is invalid
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const result = await client.documents.copy(
   *   'vault-uuid',
   *   'templates/meeting.md',
   *   'notes/2024-01-15-meeting.md'
   * );
   * ```
   *
   * @see {@link DocumentsResource.move} to relocate a document instead
   */
  async copy(vaultId: string, sourcePath: string, destination: string, overwrite?: boolean): Promise<{ message: string; source: string; destination: string }> {
    try {
      return await this.http.post(`vaults/${vaultId}/documents/${sourcePath}/copy`, {
        json: { destination, overwrite },
      }).json<{ message: string; source: string; destination: string }>();
    } catch (error) {
      throw await handleError(error, 'Document', sourcePath);
    }
  }

  /**
   * Creates or updates a document with client-side encryption.
   *
   * The content is encrypted locally using AES-256-GCM before being sent to
   * the server. The server stores only the ciphertext and cannot read the
   * plaintext content. Search indexing, AI features, and hooks are disabled
   * for encrypted documents.
   *
   * @param vaultId - The vault ID to write the document into
   * @param docPath - File path relative to vault root (must end with `.md`)
   * @param content - Raw Markdown content to encrypt and write
   * @param keyHex - The 256-bit vault encryption key as a hex string
   * @returns The created or updated document metadata
   * @throws {Error} If the key is invalid
   */
  async putEncrypted(vaultId: string, docPath: string, content: string, keyHex: string): Promise<Document> {
    try {
      const encryptedContent = encrypt(content, keyHex);
      return await this.http.put(`vaults/${vaultId}/documents/${docPath}`, {
        json: { content: encryptedContent, encrypted: true, encryptionAlgorithm: 'aes-256-gcm' },
      }).json<Document>();
    } catch (error) {
      throw await handleError(error, 'Document', docPath);
    }
  }

  /**
   * Retrieves an encrypted document and decrypts it client-side.
   *
   * @param vaultId - The vault ID containing the document
   * @param docPath - File path relative to vault root
   * @param keyHex - The 256-bit vault encryption key as a hex string
   * @returns The document metadata and decrypted plaintext content
   * @throws {Error} If the key is invalid or decryption fails
   */
  async getEncrypted(vaultId: string, docPath: string, keyHex: string): Promise<DocumentWithContent> {
    try {
      const result = await this.http.get(`vaults/${vaultId}/documents/${docPath}`).json<DocumentWithContent>();
      if (result.document.encrypted) {
        result.content = await decrypt(result.content, keyHex);
      }
      return result;
    } catch (error) {
      throw await handleError(error, 'Document', docPath);
    }
  }

  /**
   * Lists version history for a document.
   *
   * @param vaultId - The vault ID containing the document
   * @param docPath - File path relative to vault root
   * @returns Array of version metadata objects (newest first)
   */
  async listVersions(vaultId: string, docPath: string): Promise<DocumentVersion[]> {
    try {
      const data = await this.http.get(`vaults/${vaultId}/documents/${docPath}/versions`).json<{ versions: DocumentVersion[] }>();
      return data.versions;
    } catch (error) {
      throw await handleError(error, 'Document', docPath);
    }
  }

  /**
   * Retrieves a specific version's content.
   *
   * @param vaultId - The vault ID containing the document
   * @param docPath - File path relative to vault root
   * @param versionNum - The version number to retrieve
   * @returns The version metadata and content
   */
  async getVersion(vaultId: string, docPath: string, versionNum: number): Promise<DocumentVersionWithContent> {
    try {
      const data = await this.http.get(`vaults/${vaultId}/documents/${docPath}/versions/${versionNum}`).json<{ version: DocumentVersionWithContent }>();
      return data.version;
    } catch (error) {
      throw await handleError(error, 'Document', docPath);
    }
  }

  /**
   * Computes a diff between two versions of a document.
   *
   * @param vaultId - The vault ID containing the document
   * @param docPath - File path relative to vault root
   * @param from - Source version number
   * @param to - Target version number
   * @returns The diff with line-level changes
   */
  async diffVersions(vaultId: string, docPath: string, from: number, to: number): Promise<VersionDiffResponse> {
    try {
      return await this.http.post(`vaults/${vaultId}/documents/${docPath}/versions/diff`, {
        json: { from, to },
      }).json<VersionDiffResponse>();
    } catch (error) {
      throw await handleError(error, 'Document', docPath);
    }
  }

  /**
   * Restores a document to a previous version.
   *
   * @param vaultId - The vault ID containing the document
   * @param docPath - File path relative to vault root
   * @param versionNum - The version number to restore
   * @returns The updated document metadata
   */
  async restoreVersion(vaultId: string, docPath: string, versionNum: number): Promise<Document> {
    try {
      const data = await this.http.post(`vaults/${vaultId}/documents/${docPath}/versions/${versionNum}/restore`).json<{ document: Document }>();
      return data.document;
    } catch (error) {
      throw await handleError(error, 'Document', docPath);
    }
  }

  /**
   * Pins a version to prevent it from being pruned.
   *
   * @param vaultId - The vault ID containing the document
   * @param docPath - File path relative to vault root
   * @param versionNum - The version number to pin
   * @returns The updated version metadata
   */
  async pinVersion(vaultId: string, docPath: string, versionNum: number): Promise<DocumentVersion> {
    try {
      const data = await this.http.post(`vaults/${vaultId}/documents/${docPath}/versions/${versionNum}/pin`).json<{ version: DocumentVersion }>();
      return data.version;
    } catch (error) {
      throw await handleError(error, 'Document', docPath);
    }
  }

  /**
   * Unpins a version, allowing it to be pruned.
   *
   * @param vaultId - The vault ID containing the document
   * @param docPath - File path relative to vault root
   * @param versionNum - The version number to unpin
   * @returns The updated version metadata
   */
  async unpinVersion(vaultId: string, docPath: string, versionNum: number): Promise<DocumentVersion> {
    try {
      const data = await this.http.post(`vaults/${vaultId}/documents/${docPath}/versions/${versionNum}/unpin`).json<{ version: DocumentVersion }>();
      return data.version;
    } catch (error) {
      throw await handleError(error, 'Document', docPath);
    }
  }

  /**
   * Lists forward links (outgoing wikilinks) from a document.
   *
   * @param vaultId - The vault ID containing the document
   * @param docPath - File path relative to vault root
   * @returns Array of forward link objects
   * @throws {NotFoundError} If the vault or document does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const links = await client.documents.getLinks('vault-uuid', 'notes/index.md');
   * for (const link of links) {
   *   console.log(`[[${link.linkText}]] -> ${link.targetPath} (resolved: ${link.isResolved})`);
   * }
   * ```
   */
  async getLinks(vaultId: string, docPath: string): Promise<ForwardLinkResult[]> {
    try {
      const data = await this.http.get(`vaults/${vaultId}/links/forward/${docPath}`).json<{ links: ForwardLinkResult[] }>();
      return data.links;
    } catch (error) {
      throw await handleError(error, 'Document', docPath);
    }
  }

  /**
   * Lists backlinks (incoming links) pointing to a document.
   *
   * @param vaultId - The vault ID containing the document
   * @param docPath - File path relative to vault root
   * @returns Array of backlink objects with source document info
   * @throws {NotFoundError} If the vault or document does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const backlinks = await client.documents.getBacklinks('vault-uuid', 'notes/important.md');
   * console.log(`${backlinks.length} documents link to this one`);
   * for (const bl of backlinks) {
   *   console.log(`- ${bl.sourceDocument.path}: [[${bl.linkText}]]`);
   * }
   * ```
   */
  async getBacklinks(vaultId: string, docPath: string): Promise<BacklinkResult[]> {
    try {
      const data = await this.http.get(`vaults/${vaultId}/links/backlinks/${docPath}`).json<{ backlinks: BacklinkResult[] }>();
      return data.backlinks;
    } catch (error) {
      throw await handleError(error, 'Document', docPath);
    }
  }

  async bulkMove(vaultId: string, params: { items: string[]; destination: string }): Promise<BulkOperationResult> {
    try {
      return await this.http.post(`vaults/${vaultId}/documents/bulk-move`, { json: params }).json<BulkOperationResult>();
    } catch (error) {
      throw await handleError(error, 'Document', vaultId);
    }
  }

  async bulkCopy(vaultId: string, params: { items: string[]; destination: string }): Promise<BulkOperationResult> {
    try {
      return await this.http.post(`vaults/${vaultId}/documents/bulk-copy`, { json: params }).json<BulkOperationResult>();
    } catch (error) {
      throw await handleError(error, 'Document', vaultId);
    }
  }

  async bulkDelete(vaultId: string, params: { items: string[] }): Promise<BulkOperationResult> {
    try {
      return await this.http.post(`vaults/${vaultId}/documents/bulk-delete`, { json: params }).json<BulkOperationResult>();
    } catch (error) {
      throw await handleError(error, 'Document', vaultId);
    }
  }

  async bulkTag(vaultId: string, params: { items: string[]; addTags?: string[]; removeTags?: string[] }): Promise<BulkOperationResult> {
    try {
      return await this.http.post(`vaults/${vaultId}/documents/bulk-tag`, { json: params }).json<BulkOperationResult>();
    } catch (error) {
      throw await handleError(error, 'Document', vaultId);
    }
  }

  async createDirectory(vaultId: string, path: string): Promise<{ path: string; created: boolean }> {
    try {
      return await this.http.post(`vaults/${vaultId}/documents/directories`, { json: { path } }).json<{ path: string; created: boolean }>();
    } catch (error) {
      throw await handleError(error, 'Document', vaultId);
    }
  }

  /**
   * Async generator that yields all documents in a vault, automatically handling pagination.
   *
   * @param vaultId - The vault ID to list documents from
   * @param dirPath - Optional directory path filter
   * @param pageSize - Number of documents per page (default: 100)
   * @param maxPages - Safety limit on the number of pages fetched (default: 1000)
   * @param signal - Optional AbortSignal to cancel the iteration mid-stream
   * @yields DocumentListItem objects
   */
  async *listAll(vaultId: string, dirPath?: string, pageSize = 100, maxPages = 1000, signal?: AbortSignal): AsyncGenerator<DocumentListItem> {
    let offset = 0;
    let pageCount = 0;

    while (pageCount < maxPages) {
      if (signal?.aborted) break;
      const searchParams: Record<string, string | number> = { limit: pageSize, offset };
      if (dirPath) searchParams.dir = dirPath;
      try {
        const data = await this.http.get(`vaults/${vaultId}/documents`, { searchParams, signal }).json<{ documents: DocumentListItem[] }>();
        const results = data.documents;

        if (!Array.isArray(results) || results.length === 0) break;

        for (const doc of results) {
          yield doc;
        }

        if (results.length < pageSize) break;
        offset += results.length;
        pageCount++;
      } catch (error) {
        throw await handleError(error, 'Documents', vaultId);
      }
    }
  }

  /**
   * Creates or updates multiple documents sequentially.
   *
   * @param vaultId - The vault ID
   * @param docs - Array of {path, content} objects to write
   * @returns Result with succeeded paths and failed operations
   */
  async putMany(vaultId: string, docs: Array<{ path: string; content: string }>): Promise<BulkOperationResult> {
    const succeeded: string[] = [];
    const failed: Array<{ path: string; error: string }> = [];
    for (const doc of docs) {
      try {
        await this.put(vaultId, doc.path, doc.content);
        succeeded.push(doc.path);
      } catch (error) {
        failed.push({ path: doc.path, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { succeeded, failed };
  }

  /**
   * Deletes multiple documents using the bulk delete API endpoint.
   *
   * @param vaultId - The vault ID
   * @param paths - Array of document paths to delete
   * @returns Result with succeeded and failed paths
   */
  async deleteMany(vaultId: string, paths: string[]): Promise<BulkOperationResult> {
    return this.bulkDelete(vaultId, { items: paths });
  }
}
