import { handleError } from '../handle-error.js';
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
    http;
    constructor(http) {
        this.http = http;
    }
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
    async list(vaultId) {
        try {
            const searchParams = vaultId ? { vaultId } : undefined;
            return await this.http.get('connectors', { searchParams }).json();
        }
        catch (error) {
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
    async get(connectorId) {
        try {
            return await this.http.get(`connectors/${connectorId}`).json();
        }
        catch (error) {
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
    async create(params) {
        try {
            return await this.http.post('connectors', { json: params }).json();
        }
        catch (error) {
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
    async update(connectorId, params) {
        try {
            return await this.http.put(`connectors/${connectorId}`, { json: params }).json();
        }
        catch (error) {
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
    async delete(connectorId) {
        try {
            await this.http.delete(`connectors/${connectorId}`);
        }
        catch (error) {
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
    async test(connectorId) {
        try {
            return await this.http.post(`connectors/${connectorId}/test`).json();
        }
        catch (error) {
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
    async sync(connectorId) {
        try {
            return await this.http.post(`connectors/${connectorId}/sync`).json();
        }
        catch (error) {
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
    async logs(connectorId) {
        try {
            return await this.http.get(`connectors/${connectorId}/logs`).json();
        }
        catch (error) {
            throw await handleError(error, 'Connector', connectorId);
        }
    }
}
//# sourceMappingURL=connectors.js.map