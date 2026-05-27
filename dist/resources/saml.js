import { handleError } from '../handle-error.js';
/**
 * Resource for SAML SSO configuration management and metadata retrieval.
 *
 * Admin CRUD methods require admin-level authentication.
 * `getMetadata()` and `getLoginUrl()` are public/helper methods.
 *
 * @example
 * ```typescript
 * const configs = await client.saml.listConfigs();
 * const loginUrl = client.saml.getLoginUrl('acmecorp');
 * ```
 */
export class SamlResource {
    http;
    baseUrl;
    constructor(http, baseUrl) {
        this.http = http;
        this.baseUrl = baseUrl;
    }
    /**
     * Lists all SSO configurations. Admin only.
     *
     * @returns Array of SSO configurations
     * @throws {AuthenticationError} If not authenticated
     * @throws {AuthorizationError} If the user is not an admin
     * @throws {NetworkError} If the request fails due to network issues
     */
    async listConfigs() {
        try {
            return await this.http.get('admin/sso-configs').json();
        }
        catch (error) {
            throw await handleError(error, 'SSO Configs', '');
        }
    }
    /**
     * Retrieves a single SSO configuration by ID. Admin only.
     *
     * @param id - SSO config ID
     * @returns The SSO configuration
     * @throws {NotFoundError} If no config exists with the given ID
     * @throws {AuthenticationError} If not authenticated
     * @throws {AuthorizationError} If the user is not an admin
     * @throws {NetworkError} If the request fails due to network issues
     */
    async getConfig(id) {
        try {
            return await this.http.get(`admin/sso-configs/${id}`).json();
        }
        catch (error) {
            throw await handleError(error, 'SSO Config', id);
        }
    }
    /**
     * Creates a new SSO configuration. Admin only.
     *
     * @param data - SSO config creation input
     * @returns The created SSO configuration
     * @throws {ValidationError} If the data is invalid
     * @throws {ConflictError} If a config with the same slug or domain already exists
     * @throws {AuthenticationError} If not authenticated
     * @throws {AuthorizationError} If the user is not an admin
     * @throws {NetworkError} If the request fails due to network issues
     */
    async createConfig(data) {
        try {
            return await this.http.post('admin/sso-configs', { json: data }).json();
        }
        catch (error) {
            throw await handleError(error, 'Create SSO Config', data.slug);
        }
    }
    /**
     * Updates an existing SSO configuration. Admin only.
     *
     * @param id - SSO config ID
     * @param data - Fields to update
     * @returns The updated SSO configuration
     * @throws {ValidationError} If the data is invalid
     * @throws {NotFoundError} If no config exists with the given ID
     * @throws {AuthenticationError} If not authenticated
     * @throws {AuthorizationError} If the user is not an admin
     * @throws {NetworkError} If the request fails due to network issues
     */
    async updateConfig(id, data) {
        try {
            return await this.http.put(`admin/sso-configs/${id}`, { json: data }).json();
        }
        catch (error) {
            throw await handleError(error, 'Update SSO Config', id);
        }
    }
    /**
     * Deletes an SSO configuration. Admin only.
     *
     * @param id - SSO config ID
     * @throws {NotFoundError} If no config exists with the given ID
     * @throws {AuthenticationError} If not authenticated
     * @throws {AuthorizationError} If the user is not an admin
     * @throws {NetworkError} If the request fails due to network issues
     */
    async deleteConfig(id) {
        try {
            await this.http.delete(`admin/sso-configs/${id}`);
        }
        catch (error) {
            throw await handleError(error, 'Delete SSO Config', id);
        }
    }
    /**
     * Retrieves the SP (Service Provider) metadata XML for an IdP slug.
     *
     * @param slug - The IdP slug used in SAML endpoints
     * @returns XML metadata string
     * @throws {NotFoundError} If no SSO config exists with the given slug
     * @throws {NetworkError} If the request fails due to network issues
     */
    async getMetadata(slug) {
        try {
            return await this.http.get(`auth/saml/${slug}/metadata`).text();
        }
        catch (error) {
            throw await handleError(error, 'SAML Metadata', slug);
        }
    }
    /**
     * Returns the IdP login redirect URL for a given slug.
     * This is a pure URL builder — no HTTP call is made.
     *
     * @param slug - The IdP slug used in SAML endpoints
     * @returns Full login URL string
     */
    getLoginUrl(slug) {
        return `${this.baseUrl}/api/v1/auth/saml/${slug}/login`;
    }
}
//# sourceMappingURL=saml.js.map