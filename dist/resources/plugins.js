import { handleError } from '../handle-error.js';
/**
 * Resource for plugin/extension marketplace management.
 *
 * Allows listing, installing, uninstalling, enabling, disabling,
 * and configuring plugins for the authenticated user.
 *
 * @example
 * ```typescript
 * const plugins = await client.plugins.list();
 * await client.plugins.enable('my-plugin-id');
 * ```
 */
export class PluginsResource {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Lists all installed plugins for the authenticated user.
     *
     * @returns Array of installed plugin records
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async list() {
        try {
            return await this.http.get('plugins').json();
        }
        catch (error) {
            throw await handleError(error, 'Plugins', '');
        }
    }
    /**
     * Installs a plugin from the marketplace.
     *
     * @param data - Plugin installation input (pluginId and version)
     * @returns The installed plugin record
     * @throws {ValidationError} If the input is invalid
     * @throws {ConflictError} If the plugin is already installed
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async install(data) {
        try {
            return await this.http.post('plugins', { json: data }).json();
        }
        catch (error) {
            throw await handleError(error, 'Install Plugin', data.pluginId);
        }
    }
    /**
     * Uninstalls a plugin.
     *
     * @param pluginId - Plugin marketplace identifier
     * @throws {NotFoundError} If no installed plugin matches the given ID
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async uninstall(pluginId) {
        try {
            await this.http.delete(`plugins/${encodeURIComponent(pluginId)}`);
        }
        catch (error) {
            throw await handleError(error, 'Uninstall Plugin', pluginId);
        }
    }
    /**
     * Enables a plugin.
     *
     * @param pluginId - Plugin marketplace identifier
     * @returns The updated plugin record
     * @throws {NotFoundError} If no installed plugin matches the given ID
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async enable(pluginId) {
        try {
            return await this.http.patch(`plugins/${encodeURIComponent(pluginId)}`, {
                json: { enabled: true },
            }).json();
        }
        catch (error) {
            throw await handleError(error, 'Enable Plugin', pluginId);
        }
    }
    /**
     * Disables a plugin.
     *
     * @param pluginId - Plugin marketplace identifier
     * @returns The updated plugin record
     * @throws {NotFoundError} If no installed plugin matches the given ID
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async disable(pluginId) {
        try {
            return await this.http.patch(`plugins/${encodeURIComponent(pluginId)}`, {
                json: { enabled: false },
            }).json();
        }
        catch (error) {
            throw await handleError(error, 'Disable Plugin', pluginId);
        }
    }
    /**
     * Updates plugin-specific settings.
     *
     * @param pluginId - Plugin marketplace identifier
     * @param settings - New settings object (replaces current settings)
     * @returns The updated plugin record
     * @throws {NotFoundError} If no installed plugin matches the given ID
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async updateSettings(pluginId, settings) {
        try {
            return await this.http.patch(`plugins/${encodeURIComponent(pluginId)}`, {
                json: { settings },
            }).json();
        }
        catch (error) {
            throw await handleError(error, 'Update Plugin Settings', pluginId);
        }
    }
}
//# sourceMappingURL=plugins.js.map