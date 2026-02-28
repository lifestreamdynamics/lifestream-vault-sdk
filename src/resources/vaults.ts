import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

/** A vault object returned by the API. */
export interface Vault {
  /** Unique vault identifier. */
  id: string;
  /** Display name of the vault. */
  name: string;
  /** URL-friendly slug, unique per user. */
  slug: string;
  /** Optional vault description. */
  description: string | null;
  /** Whether client-side encryption is enabled for this vault. */
  encryptionEnabled: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string;
  /** Whether the vault is archived. */
  isArchived: boolean;
  /** ISO 8601 timestamp when the vault was archived, or null. */
  archivedAt: string | null;
  /** Team ID if the vault belongs to a team, or null. */
  teamId: string | null;
  /** ID of the user who owns the vault. */
  userId: string;
  /** Base directory filter for this vault, or null. */
  baseDir: string | null;
}

/** Node in the vault link graph. */
export interface LinkGraphNode {
  id: string;
  path: string;
  title: string | null;
}

/** Edge in the vault link graph. */
export interface LinkGraphEdge {
  source: string;
  target: string;
  linkText: string;
}

/** Response for the vault link graph endpoint. */
export interface LinkGraphResponse {
  nodes: LinkGraphNode[];
  edges: LinkGraphEdge[];
}

/** A reference to an unresolved (broken) link. */
export interface UnresolvedLinkReference {
  sourceDocumentId: string;
  sourcePath: string;
  sourceTitle: string | null;
  linkText: string;
}

/** An unresolved link grouped by target path. */
export interface UnresolvedLink {
  targetPath: string;
  references: UnresolvedLinkReference[];
}

/** A node in the vault file tree. */
export interface VaultTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: VaultTreeNode[];
}

/** A vault export job record. */
export interface VaultExportRecord {
  id: string;
  vaultId: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  format: 'zip';
  includeMetadata: boolean;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
}

/** Vault-level MFA configuration and verification state. */
export interface VaultMfaConfig {
  mfaRequired: boolean;
  sessionWindowMinutes: number;
  userVerified?: boolean;
  verificationExpiresAt?: string | null;
}

/**
 * Resource for managing vaults.
 *
 * Vaults are isolated document storage containers. Each vault has a unique
 * slug and can hold an arbitrary number of Markdown documents organized
 * in a directory structure.
 *
 * @example
 * ```typescript
 * const vaults = await client.vaults.list();
 * const vault = await client.vaults.create({ name: 'My Notes' });
 * ```
 */
export class VaultsResource {
  constructor(private http: KyInstance) {}

  /**
   * Lists all vaults accessible to the authenticated user.
   *
   * @returns Array of vault objects
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const vaults = await client.vaults.list();
   * for (const vault of vaults) {
   *   console.log(vault.name, vault.slug);
   * }
   * ```
   */
  async list(): Promise<Vault[]> {
    try {
      const data = await this.http.get('vaults').json<{ vaults: Vault[] }>();
      return data.vaults;
    } catch (error) {
      throw await handleError(error, 'Vaults', '');
    }
  }

  /**
   * Retrieves a single vault by ID.
   *
   * @param vaultId - The unique identifier of the vault
   * @returns The vault object
   * @throws {NotFoundError} If no vault exists with the given ID
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const vault = await client.vaults.get('vault-uuid');
   * console.log(vault.name);
   * ```
   */
  async get(vaultId: string): Promise<Vault> {
    try {
      return await this.http.get(`vaults/${vaultId}`).json<Vault>();
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Creates a new vault.
   *
   * A URL-friendly slug is automatically generated from the vault name.
   *
   * @param params - Vault creation parameters
   * @param params.name - Display name for the vault (required)
   * @param params.description - Optional description of the vault's purpose
   * @returns The newly created vault object
   * @throws {ValidationError} If the name is empty or the generated slug conflicts with an existing vault
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const vault = await client.vaults.create({
   *   name: 'Work Documents',
   *   description: 'Team documentation and notes',
   * });
   * console.log(vault.id, vault.slug);
   * ```
   *
   * @see {@link VaultsResource.update} to modify an existing vault
   */
  async create(params: { name: string; description?: string; encryptionEnabled?: boolean }): Promise<Vault> {
    try {
      return await this.http.post('vaults', { json: params }).json<Vault>();
    } catch (error) {
      throw await handleError(error, 'Vault', params.name);
    }
  }

  /**
   * Updates an existing vault's metadata.
   *
   * Only the provided fields are modified; omitted fields remain unchanged.
   * Set `description` to `null` to clear it.
   *
   * @param vaultId - The unique identifier of the vault to update
   * @param params - Fields to update
   * @param params.name - New display name for the vault
   * @param params.description - New description, or `null` to clear
   * @returns The updated vault object
   * @throws {NotFoundError} If no vault exists with the given ID
   * @throws {ValidationError} If the new name produces a conflicting slug
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const updated = await client.vaults.update('vault-uuid', {
   *   name: 'Renamed Vault',
   *   description: null,
   * });
   * ```
   *
   * @see {@link VaultsResource.create} to create a new vault
   */
  async update(vaultId: string, params: { name?: string; description?: string | null }): Promise<Vault> {
    try {
      return await this.http.patch(`vaults/${vaultId}`, { json: params }).json<Vault>();
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Permanently deletes a vault and all its documents.
   *
   * This action is irreversible. All documents within the vault will be
   * removed from both the filesystem and the database.
   *
   * @param vaultId - The unique identifier of the vault to delete
   * @throws {NotFoundError} If no vault exists with the given ID
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * await client.vaults.delete('vault-uuid');
   * ```
   */
  async delete(vaultId: string): Promise<void> {
    try {
      await this.http.delete(`vaults/${vaultId}`);
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Gets the link graph for a vault showing all document connections.
   *
   * Returns nodes (documents) and edges (wikilinks) that form the vault's
   * bidirectional link graph. Useful for visualization and graph analysis.
   *
   * @param vaultId - The vault ID
   * @returns Nodes (documents) and edges (links) forming the vault's link graph
   * @throws {NotFoundError} If the vault does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const graph = await client.vaults.getGraph('vault-uuid');
   * console.log(`${graph.nodes.length} documents, ${graph.edges.length} links`);
   * // Render graph visualization
   * ```
   */
  async getGraph(vaultId: string): Promise<LinkGraphResponse> {
    try {
      return await this.http.get(`vaults/${vaultId}/links/graph`).json<LinkGraphResponse>();
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Lists unresolved (broken) links in a vault.
   *
   * Returns wikilinks that point to non-existent documents, grouped by
   * target path. Useful for finding and fixing broken references.
   *
   * @param vaultId - The vault ID
   * @returns Array of unresolved links grouped by target path
   * @throws {NotFoundError} If the vault does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const broken = await client.vaults.getUnresolvedLinks('vault-uuid');
   * for (const link of broken) {
   *   console.log(`Missing: ${link.targetPath}`);
   *   for (const ref of link.references) {
   *     console.log(`  Referenced by: ${ref.sourcePath}`);
   *   }
   * }
   * ```
   */
  async getUnresolvedLinks(vaultId: string): Promise<UnresolvedLink[]> {
    try {
      const data = await this.http.get(`vaults/${vaultId}/links/unresolved`).json<{ unresolvedLinks: UnresolvedLink[] }>();
      return data.unresolvedLinks;
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Returns the file tree for a vault as a nested structure.
   *
   * @param vaultId - The vault ID
   * @returns Array of tree nodes (files and directories, nested)
   * @throws {NotFoundError} If the vault does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async getTree(vaultId: string): Promise<VaultTreeNode[]> {
    try {
      const data = await this.http.get(`vaults/${vaultId}/tree`).json<{ tree: VaultTreeNode[] }>();
      return data.tree;
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Archives a vault, hiding it from the default vault list.
   *
   * Archived vaults are read-only and excluded from search results.
   * Use `unarchive()` to restore access.
   *
   * @param vaultId - The vault ID to archive
   * @returns The updated vault object with `isArchived: true`
   * @throws {NotFoundError} If the vault does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async archive(vaultId: string): Promise<Vault> {
    try {
      const data = await this.http.patch(`vaults/${vaultId}/archive`).json<{ vault: Vault }>();
      return data.vault;
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Restores an archived vault to active status.
   *
   * @param vaultId - The vault ID to unarchive
   * @returns The updated vault object with `isArchived: false`
   * @throws {NotFoundError} If the vault does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async unarchive(vaultId: string): Promise<Vault> {
    try {
      const data = await this.http.patch(`vaults/${vaultId}/unarchive`).json<{ vault: Vault }>();
      return data.vault;
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Creates a zip export job for a vault.
   *
   * Export jobs are processed asynchronously. Poll `listExports()` until
   * the job status is `complete`, then download with `downloadExport()`.
   *
   * @param vaultId - The vault ID to export
   * @param params - Export options
   * @param params.includeMetadata - Include document metadata in the archive. Default: false.
   * @param params.format - Export format (currently only `'zip'`). Default: `'zip'`.
   * @returns The created export job record
   * @throws {NotFoundError} If the vault does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async createExport(vaultId: string, params?: { includeMetadata?: boolean; format?: 'zip' }): Promise<VaultExportRecord> {
    try {
      return await this.http.post(`vaults/${vaultId}/export`, { json: params ?? {} }).json<VaultExportRecord>();
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Lists all export jobs for a vault.
   *
   * @param vaultId - The vault ID
   * @returns Array of export job records, newest first
   * @throws {NotFoundError} If the vault does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async listExports(vaultId: string): Promise<VaultExportRecord[]> {
    try {
      const data = await this.http.get(`vaults/${vaultId}/export`).json<{ exports: VaultExportRecord[] }>();
      return data.exports;
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Downloads a completed vault export archive.
   *
   * @param vaultId - The vault ID
   * @param exportId - The export job ID (must have `status: 'complete'`)
   * @returns A `Blob` containing the zip archive
   * @throws {NotFoundError} If the vault or export does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async downloadExport(vaultId: string, exportId: string): Promise<Blob> {
    try {
      return await this.http.get(`vaults/${vaultId}/export/${exportId}/download`).blob();
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Transfers vault ownership to another user.
   *
   * After transfer, the current user loses access to the vault. The target
   * user must have an active account.
   *
   * @param vaultId - The vault ID to transfer
   * @param targetEmail - Email address of the user to transfer ownership to
   * @returns The updated vault object with the new owner
   * @throws {NotFoundError} If the vault or target user does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async transfer(vaultId: string, targetEmail: string): Promise<Vault> {
    try {
      const data = await this.http.post(`vaults/${vaultId}/transfer`, { json: { targetEmail } }).json<{ vault: Vault }>();
      return data.vault;
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Retrieves the vault-level MFA configuration.
   *
   * @param vaultId - The vault ID
   * @returns The vault MFA configuration and current session verification status
   * @throws {NotFoundError} If the vault does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async getMfaConfig(vaultId: string): Promise<VaultMfaConfig> {
    try {
      return await this.http.get(`vaults/${vaultId}/mfa`).json<VaultMfaConfig>();
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Sets the vault-level MFA requirement configuration.
   *
   * When `mfaRequired` is `true`, users must re-verify with MFA before
   * accessing the vault, within the configured session window.
   *
   * @param vaultId - The vault ID
   * @param params - MFA configuration parameters
   * @param params.mfaRequired - Whether MFA is required to access the vault
   * @param params.sessionWindowMinutes - How long an MFA verification session lasts (minutes)
   * @returns The updated vault MFA configuration
   * @throws {NotFoundError} If the vault does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async setMfaConfig(vaultId: string, params: { mfaRequired: boolean; sessionWindowMinutes?: number }): Promise<VaultMfaConfig> {
    try {
      return await this.http.put(`vaults/${vaultId}/mfa`, { json: params }).json<VaultMfaConfig>();
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Verifies MFA for vault access, establishing a session window.
   *
   * Must be called before accessing a vault with `mfaRequired: true`. The
   * verification is valid for the configured `sessionWindowMinutes`.
   *
   * @param vaultId - The vault ID
   * @param params - Verification parameters
   * @param params.method - MFA method to use (`'totp'` or `'backup_code'`)
   * @param params.code - The TOTP code or backup code
   * @returns Verification result with `verified` flag and session expiry
   * @throws {NotFoundError} If the vault does not exist
   * @throws {ValidationError} If the code is invalid or the method is unsupported
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async verifyMfa(vaultId: string, params: { method: 'totp' | 'backup_code'; code: string }): Promise<{ verified: boolean; expiresAt: string }> {
    try {
      return await this.http.post(`vaults/${vaultId}/mfa/verify`, { json: params }).json<{ verified: boolean; expiresAt: string }>();
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }

  /**
   * Async generator that yields all vaults, automatically handling pagination.
   *
   * Note: The vaults list endpoint doesn't paginate today, so this yields all
   * results in a single batch. It exists for API consistency with other listAll() methods.
   *
   * @yields Vault objects
   */
  async *listAll(): AsyncGenerator<Vault> {
    const vaults = await this.list();
    for (const vault of vaults) {
      yield vault;
    }
  }
}
