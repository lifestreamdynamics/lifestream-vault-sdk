import type { KyInstance } from 'ky';
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
    targetDocument: {
        id: string;
        path: string;
        title: string | null;
    } | null;
}
/** Backlink pointing to a document from another. */
export interface BacklinkResult {
    id: string;
    sourceDocumentId: string;
    linkText: string;
    contextSnippet: string | null;
    sourceDocument: {
        id: string;
        path: string;
        title: string | null;
    };
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
    failed: Array<{
        path: string;
        error: string;
    }>;
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
export declare class DocumentsResource {
    private http;
    constructor(http: KyInstance);
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
    list(vaultId: string, dirPath?: string): Promise<DocumentListItem[]>;
    list(vaultId: string, dirPath: string | undefined, options: Omit<DocumentListOptions, 'ifNoneMatch'> & {
        ifNoneMatch?: undefined;
    }): Promise<DocumentListItem[]>;
    list(vaultId: string, dirPath: string | undefined, options: DocumentListOptions & {
        ifNoneMatch: string;
    }): Promise<DocumentListResult>;
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
    syncList(vaultId: string, knownState: SyncListKnownState, options?: {
        dirPath?: string;
        tags?: string[];
    }): Promise<SyncListResult>;
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
    get(vaultId: string, docPath: string): Promise<DocumentWithContent>;
    get(vaultId: string, docPath: string, options: DocumentGetOptions): Promise<DocumentGetResult>;
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
    put(vaultId: string, docPath: string, content: string): Promise<Document>;
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
    delete(vaultId: string, docPath: string): Promise<void>;
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
    move(vaultId: string, sourcePath: string, destination: string, overwrite?: boolean): Promise<{
        message: string;
        source: string;
        destination: string;
    }>;
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
    copy(vaultId: string, sourcePath: string, destination: string, overwrite?: boolean): Promise<{
        message: string;
        source: string;
        destination: string;
    }>;
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
    putEncrypted(vaultId: string, docPath: string, content: string, keyHex: string): Promise<Document>;
    /**
     * Retrieves an encrypted document and decrypts it client-side.
     *
     * @param vaultId - The vault ID containing the document
     * @param docPath - File path relative to vault root
     * @param keyHex - The 256-bit vault encryption key as a hex string
     * @returns The document metadata and decrypted plaintext content
     * @throws {Error} If the key is invalid or decryption fails
     */
    getEncrypted(vaultId: string, docPath: string, keyHex: string): Promise<DocumentWithContent>;
    /**
     * Lists version history for a document.
     *
     * @param vaultId - The vault ID containing the document
     * @param docPath - File path relative to vault root
     * @returns Array of version metadata objects (newest first)
     */
    listVersions(vaultId: string, docPath: string): Promise<DocumentVersion[]>;
    /**
     * Retrieves a specific version's content.
     *
     * @param vaultId - The vault ID containing the document
     * @param docPath - File path relative to vault root
     * @param versionNum - The version number to retrieve
     * @returns The version metadata and content
     */
    getVersion(vaultId: string, docPath: string, versionNum: number): Promise<DocumentVersionWithContent>;
    /**
     * Computes a diff between two versions of a document.
     *
     * @param vaultId - The vault ID containing the document
     * @param docPath - File path relative to vault root
     * @param from - Source version number
     * @param to - Target version number
     * @returns The diff with line-level changes
     */
    diffVersions(vaultId: string, docPath: string, from: number, to: number): Promise<VersionDiffResponse>;
    /**
     * Restores a document to a previous version.
     *
     * @param vaultId - The vault ID containing the document
     * @param docPath - File path relative to vault root
     * @param versionNum - The version number to restore
     * @returns The updated document metadata
     */
    restoreVersion(vaultId: string, docPath: string, versionNum: number): Promise<Document>;
    /**
     * Pins a version to prevent it from being pruned.
     *
     * @param vaultId - The vault ID containing the document
     * @param docPath - File path relative to vault root
     * @param versionNum - The version number to pin
     * @returns The updated version metadata
     */
    pinVersion(vaultId: string, docPath: string, versionNum: number): Promise<DocumentVersion>;
    /**
     * Unpins a version, allowing it to be pruned.
     *
     * @param vaultId - The vault ID containing the document
     * @param docPath - File path relative to vault root
     * @param versionNum - The version number to unpin
     * @returns The updated version metadata
     */
    unpinVersion(vaultId: string, docPath: string, versionNum: number): Promise<DocumentVersion>;
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
    getLinks(vaultId: string, docPath: string): Promise<ForwardLinkResult[]>;
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
    getBacklinks(vaultId: string, docPath: string): Promise<BacklinkResult[]>;
    bulkMove(vaultId: string, params: {
        items: string[];
        destination: string;
    }): Promise<BulkOperationResult>;
    bulkCopy(vaultId: string, params: {
        items: string[];
        destination: string;
    }): Promise<BulkOperationResult>;
    bulkDelete(vaultId: string, params: {
        items: string[];
    }): Promise<BulkOperationResult>;
    bulkTag(vaultId: string, params: {
        items: string[];
        addTags?: string[];
        removeTags?: string[];
    }): Promise<BulkOperationResult>;
    createDirectory(vaultId: string, path: string): Promise<{
        path: string;
        created: boolean;
    }>;
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
    listAll(vaultId: string, dirPath?: string, pageSize?: number, maxPages?: number, signal?: AbortSignal): AsyncGenerator<DocumentListItem>;
    /**
     * Creates or updates multiple documents sequentially.
     *
     * @param vaultId - The vault ID
     * @param docs - Array of {path, content} objects to write
     * @returns Result with succeeded paths and failed operations
     */
    putMany(vaultId: string, docs: Array<{
        path: string;
        content: string;
    }>): Promise<BulkOperationResult>;
    /**
     * Deletes multiple documents using the bulk delete API endpoint.
     *
     * @param vaultId - The vault ID
     * @param paths - Array of document paths to delete
     * @returns Result with succeeded and failed paths
     */
    deleteMany(vaultId: string, paths: string[]): Promise<BulkOperationResult>;
}
//# sourceMappingURL=documents.d.ts.map