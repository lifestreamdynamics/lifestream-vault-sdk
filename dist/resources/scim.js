import { handleError } from '../handle-error.js';
/**
 * Resource for SCIM 2.0 user provisioning operations.
 *
 * Uses a dedicated ky instance pre-configured with the SCIM Bearer token
 * and the `/api/v1/scim/v2` prefix URL.
 *
 * @example
 * ```typescript
 * const users = await client.scim?.listUsers({ count: 50 });
 * ```
 */
export class ScimResource {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Lists SCIM-provisioned users with optional pagination and filtering.
     *
     * @param params - Optional pagination and filter parameters
     * @param params.filter - SCIM filter expression (e.g. `userName eq "user@example.com"`)
     * @param params.startIndex - 1-based start index for pagination
     * @param params.count - Maximum number of results per page (max 100)
     * @returns SCIM list response with user resources
     * @throws {AuthenticationError} If the SCIM token is invalid
     * @throws {NetworkError} If the request fails due to network issues
     */
    async listUsers(params) {
        try {
            const searchParams = {};
            if (params?.filter)
                searchParams.filter = params.filter;
            if (params?.startIndex !== undefined)
                searchParams.startIndex = params.startIndex;
            if (params?.count !== undefined)
                searchParams.count = params.count;
            return await this.http.get('Users', {
                searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
            }).json();
        }
        catch (error) {
            throw await handleError(error, 'ScimUsers', '');
        }
    }
    /**
     * Retrieves a single SCIM user by internal ID.
     *
     * @param id - Internal user ID
     * @returns The SCIM user resource
     * @throws {NotFoundError} If no user exists with the given ID
     * @throws {AuthenticationError} If the SCIM token is invalid
     * @throws {NetworkError} If the request fails due to network issues
     */
    async getUser(id) {
        try {
            return await this.http.get(`Users/${id}`).json();
        }
        catch (error) {
            throw await handleError(error, 'SCIM User', id);
        }
    }
    /**
     * Provisions a new user via SCIM.
     *
     * @param data - User provisioning data
     * @returns The created SCIM user resource
     * @throws {ConflictError} If a user with the same email already exists
     * @throws {ValidationError} If the email is missing or data is invalid
     * @throws {AuthenticationError} If the SCIM token is invalid
     * @throws {NetworkError} If the request fails due to network issues
     */
    async createUser(data) {
        try {
            return await this.http.post('Users', { json: data }).json();
        }
        catch (error) {
            throw await handleError(error, 'ScimUser', data.userName);
        }
    }
    /**
     * Updates (replaces) a user's attributes via SCIM.
     *
     * @param id - Internal user ID
     * @param data - Replacement user data
     * @returns The updated SCIM user resource
     * @throws {NotFoundError} If no user exists with the given ID
     * @throws {AuthenticationError} If the SCIM token is invalid
     * @throws {NetworkError} If the request fails due to network issues
     */
    async updateUser(id, data) {
        try {
            return await this.http.put(`Users/${id}`, { json: data }).json();
        }
        catch (error) {
            throw await handleError(error, 'SCIM Update User', id);
        }
    }
    /**
     * Deprovisions a user via SCIM. Removes SSO bindings but does not hard-delete the account.
     *
     * @param id - Internal user ID
     * @throws {NotFoundError} If no user exists with the given ID
     * @throws {AuthenticationError} If the SCIM token is invalid
     * @throws {NetworkError} If the request fails due to network issues
     */
    async deleteUser(id) {
        try {
            await this.http.delete(`Users/${id}`);
        }
        catch (error) {
            throw await handleError(error, 'SCIM Delete User', id);
        }
    }
    /**
     * Retrieves the SCIM service provider capabilities configuration.
     *
     * @returns SCIM service provider config
     * @throws {AuthenticationError} If the SCIM token is invalid
     * @throws {NetworkError} If the request fails due to network issues
     */
    async getServiceProviderConfig() {
        try {
            return await this.http.get('ServiceProviderConfig').json();
        }
        catch (error) {
            throw await handleError(error, 'ScimServiceProviderConfig', '');
        }
    }
}
//# sourceMappingURL=scim.js.map