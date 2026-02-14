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
      return await this.http.put(`vaults/${vaultId}`, { json: params }).json<Vault>();
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
}
