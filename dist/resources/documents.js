import { handleError } from '../handle-error.js';
import { SDKError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, RateLimitError, } from '../errors.js';
import { encrypt, decrypt } from '../lib/encryption.js';
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
    http;
    constructor(http) {
        this.http = http;
    }
    async list(vaultId, dirPath, options) {
        const searchParams = {};
        if (dirPath)
            searchParams.dir = dirPath;
        if (options?.limit !== undefined)
            searchParams.limit = options.limit;
        if (options?.offset !== undefined)
            searchParams.offset = options.offset;
        if (options?.tags && options.tags.length > 0)
            searchParams.tags = options.tags.join(',');
        // Unconditional path — backward-compatible, returns array directly.
        if (options?.ifNoneMatch === undefined) {
            try {
                const data = await this.http
                    .get(`vaults/${vaultId}/documents`, { searchParams })
                    .json();
                return data.documents;
            }
            catch (error) {
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
                const body = (await response.json().catch(() => ({})));
                const msg = body.message ?? `HTTP ${response.status}`;
                if (response.status === 400)
                    throw new ValidationError(msg, body.details);
                if (response.status === 401)
                    throw new AuthenticationError(msg);
                if (response.status === 403)
                    throw new AuthorizationError(msg);
                if (response.status === 404)
                    throw new NotFoundError('Vault', vaultId);
                if (response.status === 409)
                    throw new ConflictError(msg);
                if (response.status === 429)
                    throw new RateLimitError(msg);
                throw new SDKError(msg, response.status);
            }
            const body = await response.json();
            return { notModified: false, etag, documents: body.documents };
        }
        catch (error) {
            if (error instanceof SDKError)
                throw error;
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
    async syncList(vaultId, knownState, options) {
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
        const changes = [];
        const unchanged = [];
        for (const doc of result.documents) {
            const knownHash = knownState.hashes[doc.path];
            if (knownHash === undefined) {
                changes.push({ path: doc.path, contentHash: doc.contentHash, fileModifiedAt: doc.fileModifiedAt, kind: 'added' });
            }
            else if (knownHash !== doc.contentHash) {
                changes.push({ path: doc.path, contentHash: doc.contentHash, fileModifiedAt: doc.fileModifiedAt, kind: 'changed' });
            }
            else {
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
    async get(vaultId, docPath, options) {
        if (options?.ifNoneMatch === undefined) {
            try {
                return await this.http.get(`vaults/${vaultId}/documents/${docPath}`).json();
            }
            catch (error) {
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
                const body = (await response.json().catch(() => ({})));
                const msg = body.message ?? `HTTP ${response.status}`;
                if (response.status === 400)
                    throw new ValidationError(msg, body.details);
                if (response.status === 401)
                    throw new AuthenticationError(msg);
                if (response.status === 403)
                    throw new AuthorizationError(msg);
                if (response.status === 404)
                    throw new NotFoundError('Document', docPath);
                if (response.status === 409)
                    throw new ConflictError(msg);
                if (response.status === 429)
                    throw new RateLimitError(msg);
                throw new SDKError(msg, response.status);
            }
            const body = await response.json();
            return { notModified: false, etag, ...body };
        }
        catch (error) {
            // If we already threw a typed SDK error above, surface it as-is.
            if (error instanceof SDKError)
                throw error;
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
    async put(vaultId, docPath, content) {
        try {
            return await this.http.put(`vaults/${vaultId}/documents/${docPath}`, {
                json: { content },
            }).json();
        }
        catch (error) {
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
    async delete(vaultId, docPath) {
        try {
            await this.http.delete(`vaults/${vaultId}/documents/${docPath}`);
        }
        catch (error) {
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
    async move(vaultId, sourcePath, destination, overwrite) {
        try {
            return await this.http.post(`vaults/${vaultId}/documents/${sourcePath}/move`, {
                json: { destination, overwrite },
            }).json();
        }
        catch (error) {
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
    async copy(vaultId, sourcePath, destination, overwrite) {
        try {
            return await this.http.post(`vaults/${vaultId}/documents/${sourcePath}/copy`, {
                json: { destination, overwrite },
            }).json();
        }
        catch (error) {
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
    async putEncrypted(vaultId, docPath, content, keyHex) {
        try {
            const encryptedContent = encrypt(content, keyHex);
            return await this.http.put(`vaults/${vaultId}/documents/${docPath}`, {
                json: { content: encryptedContent, encrypted: true, encryptionAlgorithm: 'aes-256-gcm' },
            }).json();
        }
        catch (error) {
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
    async getEncrypted(vaultId, docPath, keyHex) {
        try {
            const result = await this.http.get(`vaults/${vaultId}/documents/${docPath}`).json();
            if (result.document.encrypted) {
                result.content = await decrypt(result.content, keyHex);
            }
            return result;
        }
        catch (error) {
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
    async listVersions(vaultId, docPath) {
        try {
            const data = await this.http.get(`vaults/${vaultId}/documents/${docPath}/versions`).json();
            return data.versions;
        }
        catch (error) {
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
    async getVersion(vaultId, docPath, versionNum) {
        try {
            const data = await this.http.get(`vaults/${vaultId}/documents/${docPath}/versions/${versionNum}`).json();
            return data.version;
        }
        catch (error) {
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
    async diffVersions(vaultId, docPath, from, to) {
        try {
            return await this.http.post(`vaults/${vaultId}/documents/${docPath}/versions/diff`, {
                json: { from, to },
            }).json();
        }
        catch (error) {
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
    async restoreVersion(vaultId, docPath, versionNum) {
        try {
            const data = await this.http.post(`vaults/${vaultId}/documents/${docPath}/versions/${versionNum}/restore`).json();
            return data.document;
        }
        catch (error) {
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
    async pinVersion(vaultId, docPath, versionNum) {
        try {
            const data = await this.http.post(`vaults/${vaultId}/documents/${docPath}/versions/${versionNum}/pin`).json();
            return data.version;
        }
        catch (error) {
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
    async unpinVersion(vaultId, docPath, versionNum) {
        try {
            const data = await this.http.post(`vaults/${vaultId}/documents/${docPath}/versions/${versionNum}/unpin`).json();
            return data.version;
        }
        catch (error) {
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
    async getLinks(vaultId, docPath) {
        try {
            const data = await this.http.get(`vaults/${vaultId}/links/forward/${docPath}`).json();
            return data.links;
        }
        catch (error) {
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
    async getBacklinks(vaultId, docPath) {
        try {
            const data = await this.http.get(`vaults/${vaultId}/links/backlinks/${docPath}`).json();
            return data.backlinks;
        }
        catch (error) {
            throw await handleError(error, 'Document', docPath);
        }
    }
    async bulkMove(vaultId, params) {
        try {
            return await this.http.post(`vaults/${vaultId}/documents/bulk-move`, { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'Document', vaultId);
        }
    }
    async bulkCopy(vaultId, params) {
        try {
            return await this.http.post(`vaults/${vaultId}/documents/bulk-copy`, { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'Document', vaultId);
        }
    }
    async bulkDelete(vaultId, params) {
        try {
            return await this.http.post(`vaults/${vaultId}/documents/bulk-delete`, { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'Document', vaultId);
        }
    }
    async bulkTag(vaultId, params) {
        try {
            return await this.http.post(`vaults/${vaultId}/documents/bulk-tag`, { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'Document', vaultId);
        }
    }
    async createDirectory(vaultId, path) {
        try {
            return await this.http.post(`vaults/${vaultId}/documents/directories`, { json: { path } }).json();
        }
        catch (error) {
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
    async *listAll(vaultId, dirPath, pageSize = 100, maxPages = 1000, signal) {
        let offset = 0;
        let pageCount = 0;
        while (pageCount < maxPages) {
            if (signal?.aborted)
                break;
            const searchParams = { limit: pageSize, offset };
            if (dirPath)
                searchParams.dir = dirPath;
            try {
                const data = await this.http.get(`vaults/${vaultId}/documents`, { searchParams, signal }).json();
                const results = data.documents;
                if (!Array.isArray(results) || results.length === 0)
                    break;
                for (const doc of results) {
                    yield doc;
                }
                if (results.length < pageSize)
                    break;
                offset += results.length;
                pageCount++;
            }
            catch (error) {
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
    async putMany(vaultId, docs) {
        const succeeded = [];
        const failed = [];
        for (const doc of docs) {
            try {
                await this.put(vaultId, doc.path, doc.content);
                succeeded.push(doc.path);
            }
            catch (error) {
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
    async deleteMany(vaultId, paths) {
        return this.bulkDelete(vaultId, { items: paths });
    }
}
//# sourceMappingURL=documents.js.map