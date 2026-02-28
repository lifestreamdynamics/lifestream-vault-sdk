import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

/** A custom domain mapped to a published vault. */
export interface CustomDomain {
  /** Unique domain identifier. */
  id: string;
  /** ID of the user who owns this domain. */
  userId: string;
  /** The domain name (e.g., `docs.example.com`). */
  domain: string;
  /** Whether the domain has been verified via DNS. */
  verified: boolean;
  /** TXT record value to add to DNS for verification. */
  verificationToken: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string;
}

/** Result of a DNS check for a custom domain. */
export interface DnsCheckResult {
  domain: string;
  resolved: boolean;
  expectedValue: string;
  actualValue?: string;
}

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
  constructor(private http: KyInstance) {}

  /**
   * Lists all custom domains for the authenticated user.
   *
   * @returns Array of custom domain objects
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async list(): Promise<CustomDomain[]> {
    try {
      const data = await this.http.get('custom-domains').json<{ domains: CustomDomain[] }>();
      return data.domains;
    } catch (error) {
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
  async create(params: { domain: string }): Promise<CustomDomain> {
    try {
      const data = await this.http.post('custom-domains', { json: params }).json<{ domain: CustomDomain }>();
      return data.domain;
    } catch (error) {
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
  async get(domainId: string): Promise<CustomDomain> {
    try {
      const data = await this.http.get(`custom-domains/${domainId}`).json<{ domain: CustomDomain }>();
      return data.domain;
    } catch (error) {
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
  async update(domainId: string, params: { domain: string }): Promise<CustomDomain> {
    try {
      const data = await this.http.patch(`custom-domains/${domainId}`, { json: params }).json<{ domain: CustomDomain }>();
      return data.domain;
    } catch (error) {
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
  async delete(domainId: string): Promise<void> {
    try {
      await this.http.delete(`custom-domains/${domainId}`);
    } catch (error) {
      throw await handleError(error, 'CustomDomain', domainId);
    }
  }

  /**
   * Triggers DNS verification for a custom domain.
   *
   * The domain must have the `verificationToken` TXT record added to its
   * DNS before calling this method. On success, the domain's `verified`
   * flag is set to `true`.
   *
   * @param domainId - The unique identifier of the custom domain to verify
   * @returns The updated domain with `verified: true` on success
   * @throws {NotFoundError} If no domain exists with the given ID
   * @throws {ValidationError} If the DNS TXT record is not found or incorrect
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async verify(domainId: string): Promise<CustomDomain> {
    try {
      const data = await this.http.post(`custom-domains/${domainId}/verify`).json<{ domain: CustomDomain }>();
      return data.domain;
    } catch (error) {
      throw await handleError(error, 'CustomDomain', domainId);
    }
  }

  /**
   * Checks the current DNS resolution status of a custom domain.
   *
   * Use this to check whether the TXT record has propagated before calling
   * `verify()`. Does not modify the domain's `verified` state.
   *
   * @param domainId - The unique identifier of the custom domain to check
   * @returns DNS check result with resolution status and expected vs actual values
   * @throws {NotFoundError} If no domain exists with the given ID
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async checkDns(domainId: string): Promise<DnsCheckResult> {
    try {
      return await this.http.get(`custom-domains/${domainId}/check`).json<DnsCheckResult>();
    } catch (error) {
      throw await handleError(error, 'CustomDomain', domainId);
    }
  }
}
