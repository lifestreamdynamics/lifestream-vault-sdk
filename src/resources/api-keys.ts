import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

/** An API key object returned by the API (secret not included). */
export interface ApiKey {
  /** Unique API key identifier. */
  id: string;
  /** Human-readable name for the key. */
  name: string;
  /** Short prefix for identifying the key (e.g., `lsv_k_ab12cd34`). */
  prefix: string;
  /** Permission scopes granted to this key (e.g., `['read', 'write']`). */
  scopes: string[];
  /** Vault ID this key is restricted to, or `null` for unrestricted access. */
  vaultId: string | null;
  /** ISO 8601 expiration timestamp, or `null` if the key does not expire. */
  expiresAt: string | null;
  /** Whether the key is currently active. */
  isActive: boolean;
  /** ISO 8601 timestamp of last usage, or `null` if never used. */
  lastUsedAt: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string;
}

/** An API key object that includes the full secret. Only returned on creation. */
export interface ApiKeyWithSecret extends ApiKey {
  /** The full API key string including secret. Only available at creation time. */
  key: string;
}

/** Parameters for creating a new API key. */
export interface CreateApiKeyParams {
  /** Human-readable name for the key. */
  name: string;
  /** Permission scopes to grant (e.g., `['read', 'write']`). */
  scopes: string[];
  /** Optional vault ID to restrict the key to a single vault. */
  vaultId?: string | null;
  /** Optional ISO 8601 expiration date. */
  expiresAt?: string | null;
}

/** Parameters for updating an existing API key. */
export interface UpdateApiKeyParams {
  /** New name for the key. */
  name?: string;
  /** Whether the key should be active. */
  isActive?: boolean;
}

/**
 * Resource for managing API keys.
 *
 * API keys provide programmatic access to the Lifestream Vault API.
 * Keys can be scoped to specific permissions and optionally restricted
 * to a single vault.
 *
 * @example
 * ```typescript
 * const keys = await client.apiKeys.list();
 * const newKey = await client.apiKeys.create({
 *   name: 'CI/CD Key',
 *   scopes: ['read', 'write'],
 * });
 * ```
 */
export class ApiKeysResource {
  constructor(private http: KyInstance) {}

  /**
   * Lists all API keys for the authenticated user.
   *
   * Returns key metadata without secrets. Use this to audit existing keys
   * or find keys to update/revoke.
   *
   * @returns Array of API key objects (without secrets)
   * @throws {AuthenticationError} If not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const keys = await client.apiKeys.list();
   * for (const key of keys) {
   *   console.log(key.name, key.prefix, key.isActive);
   * }
   * ```
   */
  async list(): Promise<ApiKey[]> {
    try {
      const data = await this.http.get('api-keys').json<{ apiKeys: ApiKey[] }>();
      return data.apiKeys;
    } catch (error) {
      throw await handleError(error, 'API keys', '');
    }
  }

  /**
   * Retrieves a specific API key by ID.
   *
   * @param keyId - The unique identifier of the API key
   * @returns The API key object (without secret)
   * @throws {NotFoundError} If no API key exists with the given ID
   * @throws {AuthenticationError} If not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const key = await client.apiKeys.get('key-uuid');
   * console.log(key.name, key.scopes);
   * ```
   */
  async get(keyId: string): Promise<ApiKey> {
    try {
      const data = await this.http.get(`api-keys/${keyId}`).json<{ apiKey: ApiKey }>();
      return data.apiKey;
    } catch (error) {
      throw await handleError(error, 'API key', keyId);
    }
  }

  /**
   * Creates a new API key.
   *
   * The full key string (including secret) is only returned on creation.
   * Store it securely — it cannot be retrieved later.
   *
   * @param params - API key creation parameters
   * @param params.name - Human-readable name for the key
   * @param params.scopes - Permission scopes to grant
   * @param params.vaultId - Optional vault ID to restrict the key to
   * @param params.expiresAt - Optional ISO 8601 expiration date
   * @returns API key object including the full key string
   * @throws {ValidationError} If parameters are invalid
   * @throws {AuthenticationError} If not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const apiKey = await client.apiKeys.create({
   *   name: 'Production Key',
   *   scopes: ['read', 'write'],
   *   vaultId: 'vault-123',
   *   expiresAt: '2027-01-01T00:00:00Z',
   * });
   * console.log('Save this key:', apiKey.key);
   * ```
   */
  async create(params: CreateApiKeyParams): Promise<ApiKeyWithSecret> {
    try {
      return await this.http.post('api-keys', { json: params }).json<ApiKeyWithSecret>();
    } catch (error) {
      throw await handleError(error, 'API key', params.name);
    }
  }

  /**
   * Updates an existing API key.
   *
   * Only the provided fields are modified; omitted fields remain unchanged.
   *
   * @param keyId - The unique identifier of the API key to update
   * @param params - Fields to update
   * @param params.name - New name for the key
   * @param params.isActive - Whether the key should be active
   * @returns The updated API key object
   * @throws {ValidationError} If parameters are invalid
   * @throws {NotFoundError} If no API key exists with the given ID
   * @throws {AuthenticationError} If not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const updated = await client.apiKeys.update('key-uuid', {
   *   name: 'Renamed Key',
   *   isActive: false,
   * });
   * ```
   */
  async update(keyId: string, params: UpdateApiKeyParams): Promise<ApiKey> {
    try {
      const data = await this.http.patch(`api-keys/${keyId}`, { json: params }).json<{ apiKey: ApiKey }>();
      return data.apiKey;
    } catch (error) {
      throw await handleError(error, 'API key', keyId);
    }
  }

  /**
   * Deletes an API key permanently.
   *
   * Once deleted, the key can no longer be used for authentication.
   * This action is irreversible.
   *
   * @param keyId - The unique identifier of the API key to delete
   * @throws {NotFoundError} If no API key exists with the given ID
   * @throws {AuthenticationError} If not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * await client.apiKeys.delete('key-uuid');
   * ```
   */
  async delete(keyId: string): Promise<void> {
    try {
      await this.http.delete(`api-keys/${keyId}`);
    } catch (error) {
      throw await handleError(error, 'API key', keyId);
    }
  }
}
