import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';
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

/** Summary information for a document in a listing. */
export interface DocumentListItem {
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
   * @param vaultId - The vault ID to list documents from
   * @param dirPath - Optional directory path to filter results (e.g., `'notes/'`)
   * @returns Array of document summary objects
   * @throws {NotFoundError} If the vault does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * // List all documents
   * const docs = await client.documents.list('vault-uuid');
   *
   * // List documents in a subdirectory
   * const notes = await client.documents.list('vault-uuid', 'notes/');
   * ```
   */
  async list(vaultId: string, dirPath?: string): Promise<DocumentListItem[]> {
    try {
      const searchParams: Record<string, string> = {};
      if (dirPath) searchParams.dir = dirPath;
      const data = await this.http.get(`vaults/${vaultId}/documents`, { searchParams }).json<{ documents: DocumentListItem[] }>();
      return data.documents;
    } catch (error) {
      throw await handleError(error, 'Documents', vaultId);
    }
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
  async get(vaultId: string, docPath: string): Promise<DocumentWithContent> {
    try {
      return await this.http.get(`vaults/${vaultId}/documents/${docPath}`).json<DocumentWithContent>();
    } catch (error) {
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
      }).json();
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
      }).json();
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
        result.content = decrypt(result.content, keyHex);
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
}
