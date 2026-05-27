import { handleError } from '../handle-error.js';
/**
 * Resource for managing vault hooks.
 *
 * Hooks are internal event handlers that run automatically when document
 * events occur within a vault. They can perform actions such as auto-tagging,
 * template application, and other automated workflows.
 *
 * Requires a **pro** or higher subscription tier.
 *
 * @example
 * ```typescript
 * const hooks = await client.hooks.list('vault-123');
 * const hook = await client.hooks.create('vault-123', {
 *   name: 'Auto-tag on create',
 *   triggerEvent: 'document.create',
 *   actionType: 'auto-tag',
 *   actionConfig: { tags: ['new'] },
 * });
 * ```
 */
export class HooksResource {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Lists all hooks for a vault.
     *
     * @param vaultId - The vault to list hooks for
     * @returns Array of hook objects
     * @throws {AuthenticationError} If not authenticated
     * @throws {AuthorizationError} If the user lacks access to the vault
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const hooks = await client.hooks.list('vault-123');
     * for (const hook of hooks) {
     *   console.log(hook.name, hook.triggerEvent, hook.isActive);
     * }
     * ```
     */
    async list(vaultId) {
        try {
            const data = await this.http.get(`vaults/${vaultId}/hooks`).json();
            return data.hooks;
        }
        catch (error) {
            throw await handleError(error, 'Hooks', vaultId);
        }
    }
    /**
     * Creates a new hook in a vault.
     *
     * @param vaultId - The vault to create the hook in
     * @param params - Hook creation parameters
     * @returns The created hook object
     * @throws {ValidationError} If parameters are invalid
     * @throws {AuthenticationError} If not authenticated
     * @throws {AuthorizationError} If the user lacks access to the vault
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const hook = await client.hooks.create('vault-123', {
     *   name: 'Auto-tag new docs',
     *   triggerEvent: 'document.create',
     *   actionType: 'auto-tag',
     *   actionConfig: { tags: ['new'] },
     * });
     * ```
     */
    async create(vaultId, params) {
        try {
            return await this.http.post(`vaults/${vaultId}/hooks`, { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'Hook', params.name);
        }
    }
    /**
     * Updates an existing hook.
     *
     * Only the provided fields are modified; omitted fields remain unchanged.
     *
     * @param vaultId - The vault the hook belongs to
     * @param hookId - The hook to update
     * @param params - Fields to update
     * @returns The updated hook object
     * @throws {ValidationError} If parameters are invalid
     * @throws {NotFoundError} If the hook does not exist in the vault
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const updated = await client.hooks.update('vault-123', 'hook-456', {
     *   name: 'Renamed Hook',
     *   isActive: false,
     * });
     * ```
     */
    async update(vaultId, hookId, params) {
        try {
            return await this.http.put(`vaults/${vaultId}/hooks/${hookId}`, { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'Hook', hookId);
        }
    }
    /**
     * Deletes a hook permanently.
     *
     * @param vaultId - The vault the hook belongs to
     * @param hookId - The hook to delete
     * @throws {NotFoundError} If the hook does not exist in the vault
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * await client.hooks.delete('vault-123', 'hook-456');
     * ```
     */
    async delete(vaultId, hookId) {
        try {
            await this.http.delete(`vaults/${vaultId}/hooks/${hookId}`);
        }
        catch (error) {
            throw await handleError(error, 'Hook', hookId);
        }
    }
    /**
     * Lists recent executions for a hook.
     *
     * Returns up to 50 most recent execution log entries, ordered by most recent first.
     *
     * @param vaultId - The vault the hook belongs to
     * @param hookId - The hook to get executions for
     * @returns Array of hook execution log entries
     * @throws {NotFoundError} If the hook does not exist in the vault
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const executions = await client.hooks.listExecutions('vault-123', 'hook-456');
     * for (const exec of executions) {
     *   console.log(exec.status, exec.durationMs, exec.createdAt);
     * }
     * ```
     */
    async listExecutions(vaultId, hookId) {
        try {
            const data = await this.http
                .get(`vaults/${vaultId}/hooks/${hookId}/executions`)
                .json();
            return data.executions;
        }
        catch (error) {
            throw await handleError(error, 'Hook', hookId);
        }
    }
}
//# sourceMappingURL=hooks.js.map