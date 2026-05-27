import type { KyInstance } from 'ky';
/** An installed plugin record. */
export interface InstalledPlugin {
    /** Unique installed-plugin record ID. */
    id: string;
    /** Plugin marketplace identifier (e.g. `org/plugin-name`). */
    pluginId: string;
    /** Installed version string. */
    version: string;
    /** Whether the plugin is currently enabled. */
    enabled: boolean;
    /** Plugin-specific settings. */
    settings: Record<string, unknown>;
    /** ISO 8601 installation timestamp. */
    installedAt: string;
    /** ISO 8601 last-updated timestamp. */
    updatedAt: string;
}
/** Input for installing a new plugin. */
export interface InstallPluginInput {
    /** Plugin marketplace identifier (e.g. `org/plugin-name`). */
    pluginId: string;
    /** Version to install. */
    version: string;
}
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
export declare class PluginsResource {
    private http;
    constructor(http: KyInstance);
    /**
     * Lists all installed plugins for the authenticated user.
     *
     * @returns Array of installed plugin records
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    list(): Promise<InstalledPlugin[]>;
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
    install(data: InstallPluginInput): Promise<InstalledPlugin>;
    /**
     * Uninstalls a plugin.
     *
     * @param pluginId - Plugin marketplace identifier
     * @throws {NotFoundError} If no installed plugin matches the given ID
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    uninstall(pluginId: string): Promise<void>;
    /**
     * Enables a plugin.
     *
     * @param pluginId - Plugin marketplace identifier
     * @returns The updated plugin record
     * @throws {NotFoundError} If no installed plugin matches the given ID
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    enable(pluginId: string): Promise<InstalledPlugin>;
    /**
     * Disables a plugin.
     *
     * @param pluginId - Plugin marketplace identifier
     * @returns The updated plugin record
     * @throws {NotFoundError} If no installed plugin matches the given ID
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    disable(pluginId: string): Promise<InstalledPlugin>;
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
    updateSettings(pluginId: string, settings: Record<string, unknown>): Promise<InstalledPlugin>;
}
//# sourceMappingURL=plugins.d.ts.map