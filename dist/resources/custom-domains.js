import { handleError } from '../handle-error.js';
/**
 * Resource for managing custom domains for published vaults.
 *
 * Allows mapping custom domains (e.g., `docs.example.com`) to published vaults
 * with DNS verification.
 *
 * @example
 * ```typescript
 * const domain = await client.customDomains.create({ domain: 'docs.example.com' });
 * console.log('Add TXT record:', domain.verificationToken);
 * ```
 */
export class CustomDomainsResource {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Lists all custom domains for the authenticated user.
     *
     * @returns Array of custom domain objects
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async list() {
        try {
            const data = await this.http.get('custom-domains').json();
            return data.domains;
        }
        catch (error) {
            throw await handleError(error, 'CustomDomain', '');
        }
    }
    /**
     * Registers a new custom domain for published vaults.
     *
     * @param params - Domain creation parameters
     * @param params.domain - The domain name to register (e.g., `docs.example.com`)
     * @returns The created domain with its DNS verification token
     * @throws {ConflictError} If the domain is already registered
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async create(params) {
        try {
            const data = await this.http.post('custom-domains', { json: params }).json();
            return data.domain;
        }
        catch (error) {
            throw await handleError(error, 'CustomDomain', params.domain);
        }
    }
    /**
     * Retrieves a custom domain by its ID.
     *
     * @param domainId - The unique identifier of the custom domain
     * @returns The custom domain object
     * @throws {NotFoundError} If no domain exists with the given ID
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async get(domainId) {
        try {
            const data = await this.http.get(`custom-domains/${domainId}`).json();
            return data.domain;
        }
        catch (error) {
            throw await handleError(error, 'CustomDomain', domainId);
        }
    }
    /**
     * Updates the domain name for an existing custom domain record.
     *
     * @param domainId - The unique identifier of the custom domain to update
     * @param params - Update parameters
     * @param params.domain - The new domain name
     * @returns The updated custom domain object
     * @throws {NotFoundError} If no domain exists with the given ID
     * @throws {ConflictError} If the new domain name is already taken
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async update(domainId, params) {
        try {
            const data = await this.http.put(`custom-domains/${domainId}`, { json: params }).json();
            return data.domain;
        }
        catch (error) {
            throw await handleError(error, 'CustomDomain', domainId);
        }
    }
    /**
     * Deletes a custom domain registration.
     *
     * @param domainId - The unique identifier of the custom domain to delete
     * @throws {NotFoundError} If no domain exists with the given ID
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async delete(domainId) {
        try {
            await this.http.delete(`custom-domains/${domainId}`);
        }
        catch (error) {
            throw await handleError(error, 'CustomDomain', domainId);
        }
    }
    /**
     * Triggers DNS verification for a custom domain.
     *
     * The domain must have the `verificationToken` TXT record added to its
     * DNS before calling this method. On success, the domain's `status`
     * is set to `'verified'`.
     *
     * @param domainId - The unique identifier of the custom domain to verify
     * @returns The updated domain with `status: 'verified'` on success
     * @throws {NotFoundError} If no domain exists with the given ID
     * @throws {ValidationError} If the DNS TXT record is not found or incorrect
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async verify(domainId) {
        try {
            const data = await this.http.post(`custom-domains/${domainId}/verify`).json();
            return data.domain;
        }
        catch (error) {
            throw await handleError(error, 'CustomDomain', domainId);
        }
    }
    /**
     * Checks the current DNS resolution status of a custom domain.
     *
     * Use this to check whether the required DNS records have propagated before
     * calling `verify()`. Does not modify the domain's `status`.
     *
     * @param domainId - The unique identifier of the custom domain to check
     * @returns DNS check response containing per-record results with expected vs found values
     * @throws {NotFoundError} If no domain exists with the given ID
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async checkDns(domainId) {
        try {
            return await this.http.post(`custom-domains/${domainId}/check`).json();
        }
        catch (error) {
            throw await handleError(error, 'CustomDomain', domainId);
        }
    }
}
//# sourceMappingURL=custom-domains.js.map