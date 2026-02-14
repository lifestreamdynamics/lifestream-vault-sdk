import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

/** Supported connector providers. */
export type ConnectorProvider = 'google_drive';

/** Sync direction for a connector. */
export type SyncDirection = 'pull' | 'push' | 'bidirectional';

/** Current status of a connector. */
export type ConnectorStatus = 'inactive' | 'active' | 'syncing' | 'error';

/** A connector object returned by the API. */
export interface Connector {
  /** Unique connector identifier. */
  id: string;
  /** User ID of the connector owner. */
  userId: string;
  /** Vault ID the connector is associated with. */
  vaultId: string;
  /** Connector provider type. */
  provider: ConnectorProvider;
  /** Display name for the connector. */
  name: string;
  /** Provider-specific configuration (sensitive fields stripped). */
  config: Record<string, unknown>;
  /** Direction of synchronization. */
  syncDirection: SyncDirection;
  /** Optional path prefix for syncing. */
  syncPath: string | null;
  /** ISO 8601 timestamp of the last successful sync, or null if never synced. */
  lastSyncAt: string | null;
  /** Current connector status. */
  status: ConnectorStatus;
  /** Whether the connector is active. */
  isActive: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string;
}

/** A sync log entry for a connector. */
export interface ConnectorSyncLog {
  /** Unique log entry identifier. */
  id: string;
  /** ID of the connector this log belongs to. */
  connectorId: string;
  /** Sync status (e.g., 'success', 'error'). */
  status: string;
  /** Number of files added during sync. */
  filesAdded: number;
  /** Number of files updated during sync. */
  filesUpdated: number;
  /** Number of files deleted during sync. */
  filesDeleted: number;
  /** Array of error details, or null if no errors. */
  errors: Record<string, unknown>[] | null;
  /** Duration of the sync in milliseconds, or null. */
  durationMs: number | null;
  /** ISO 8601 timestamp when the sync occurred. */
  createdAt: string;
}

/** Parameters for creating a new connector. */
export interface CreateConnectorParams {
  /** Connector provider type. */
  provider: ConnectorProvider;
  /** Display name for the connector. */
  name: string;
  /** Vault ID to associate the connector with. */
  vaultId: string;
  /** Direction of synchronization. */
  syncDirection: SyncDirection;
  /** Optional path prefix for syncing. */
  syncPath?: string;
  /** Provider-specific configuration. */
  config?: Record<string, unknown>;
}

/** Parameters for updating an existing connector. */
export interface UpdateConnectorParams {
  /** New display name. */
  name?: string;
  /** New sync direction. */
  syncDirection?: SyncDirection;
  /** New sync path, or `null` to clear. */
  syncPath?: string | null;
  /** Updated provider configuration. */
  config?: Record<string, unknown>;
  /** Whether the connector is active. */
  isActive?: boolean;
}

/** Result of testing a connector's connection. */
export interface TestConnectionResult {
  /** Whether the connection test succeeded. */
  success: boolean;
  /** Error message if the test failed. */
  error?: string;
}

/** Result of triggering a connector sync. */
export interface TriggerSyncResult {
  /** Confirmation message. */
  message: string;
}

/**
 * Resource for managing external connectors (e.g., Google Drive).
 *
 * Connectors allow bidirectional synchronization between vaults and
 * external storage providers. Requires the `connectors` plan feature.
 *
 * @example
 * ```typescript
 * const connectors = await client.connectors.list();
 * const connector = await client.connectors.create({
 *   provider: 'google_drive',
 *   name: 'My Drive',
 *   vaultId: 'vault-uuid',
 *   syncDirection: 'bidirectional',
 * });
 * ```
 */
export class ConnectorsResource {
  constructor(private http: KyInstance) {}

  /**
   * Lists all connectors for the authenticated user.
   *
   * @param vaultId - Optional vault ID to filter connectors by
   * @returns Array of connector objects
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user's plan does not include connectors
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const connectors = await client.connectors.list();
   * const vaultConnectors = await client.connectors.list('vault-uuid');
   * ```
   */
  async list(vaultId?: string): Promise<Connector[]> {
    try {
      const searchParams = vaultId ? { vaultId } : undefined;
      return await this.http.get('connectors', { searchParams }).json<Connector[]>();
    } catch (error) {
      throw await handleError(error, 'Connectors', '');
    }
  }

  /**
   * Retrieves a single connector by ID.
   *
   * @param connectorId - The unique identifier of the connector
   * @returns The connector object
   * @throws {NotFoundError} If no connector exists with the given ID
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const connector = await client.connectors.get('connector-uuid');
   * console.log(connector.name, connector.status);
   * ```
   */
  async get(connectorId: string): Promise<Connector> {
    try {
      return await this.http.get(`connectors/${connectorId}`).json<Connector>();
    } catch (error) {
      throw await handleError(error, 'Connector', connectorId);
    }
  }

  /**
   * Creates a new connector.
   *
   * @param params - Connector creation parameters
   * @returns The newly created connector object
   * @throws {ValidationError} If the request body is invalid
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user's plan does not include connectors
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const connector = await client.connectors.create({
   *   provider: 'google_drive',
   *   name: 'Work Drive',
   *   vaultId: 'vault-uuid',
   *   syncDirection: 'bidirectional',
   * });
   * ```
   */
  async create(params: CreateConnectorParams): Promise<Connector> {
    try {
      return await this.http.post('connectors', { json: params }).json<Connector>();
    } catch (error) {
      throw await handleError(error, 'Connector', params.name);
    }
  }

  /**
   * Updates an existing connector.
   *
   * Only the provided fields are modified; omitted fields remain unchanged.
   *
   * @param connectorId - The unique identifier of the connector to update
   * @param params - Fields to update
   * @returns The updated connector object
   * @throws {NotFoundError} If no connector exists with the given ID
   * @throws {ValidationError} If the update parameters are invalid
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const updated = await client.connectors.update('connector-uuid', {
   *   name: 'Renamed Drive',
   *   syncDirection: 'pull',
   * });
   * ```
   */
  async update(connectorId: string, params: UpdateConnectorParams): Promise<Connector> {
    try {
      return await this.http.put(`connectors/${connectorId}`, { json: params }).json<Connector>();
    } catch (error) {
      throw await handleError(error, 'Connector', connectorId);
    }
  }

  /**
   * Permanently deletes a connector.
   *
   * @param connectorId - The unique identifier of the connector to delete
   * @throws {NotFoundError} If no connector exists with the given ID
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * await client.connectors.delete('connector-uuid');
   * ```
   */
  async delete(connectorId: string): Promise<void> {
    try {
      await this.http.delete(`connectors/${connectorId}`);
    } catch (error) {
      throw await handleError(error, 'Connector', connectorId);
    }
  }

  /**
   * Tests a connector's connection to the external provider.
   *
   * @param connectorId - The unique identifier of the connector to test
   * @returns Object indicating success or failure with optional error message
   * @throws {NotFoundError} If no connector exists with the given ID
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const result = await client.connectors.test('connector-uuid');
   * if (result.success) {
   *   console.log('Connection works!');
   * } else {
   *   console.error('Connection failed:', result.error);
   * }
   * ```
   */
  async test(connectorId: string): Promise<TestConnectionResult> {
    try {
      return await this.http.post(`connectors/${connectorId}/test`).json<TestConnectionResult>();
    } catch (error) {
      throw await handleError(error, 'Connector', connectorId);
    }
  }

  /**
   * Triggers a sync for a connector. The sync runs asynchronously via a background worker.
   *
   * @param connectorId - The unique identifier of the connector to sync
   * @returns Object with a confirmation message
   * @throws {NotFoundError} If no connector exists with the given ID
   * @throws {ValidationError} If the connector is inactive
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const result = await client.connectors.sync('connector-uuid');
   * console.log(result.message); // 'Sync triggered successfully'
   * ```
   */
  async sync(connectorId: string): Promise<TriggerSyncResult> {
    try {
      return await this.http.post(`connectors/${connectorId}/sync`).json<TriggerSyncResult>();
    } catch (error) {
      throw await handleError(error, 'Connector', connectorId);
    }
  }

  /**
   * Retrieves recent sync logs for a connector.
   *
   * @param connectorId - The unique identifier of the connector
   * @returns Array of sync log entries, ordered by most recent first
   * @throws {NotFoundError} If no connector exists with the given ID
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const logs = await client.connectors.logs('connector-uuid');
   * for (const log of logs) {
   *   console.log(`${log.status}: +${log.filesAdded} ~${log.filesUpdated} -${log.filesDeleted}`);
   * }
   * ```
   */
  async logs(connectorId: string): Promise<ConnectorSyncLog[]> {
    try {
      return await this.http.get(`connectors/${connectorId}/logs`).json<ConnectorSyncLog[]>();
    } catch (error) {
      throw await handleError(error, 'Connector', connectorId);
    }
  }
}
