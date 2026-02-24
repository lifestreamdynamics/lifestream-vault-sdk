import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** An SSO configuration record. */
export interface SsoConfig {
  /** Unique SSO config identifier. */
  id: string;
  /** Customer/tenant domain (e.g. `acmecorp.com`). */
  domain: string;
  /** URL slug used in SAML endpoints (e.g. `acmecorp`). */
  slug: string;
  /** Identity Provider entity ID URI. */
  entityId: string;
  /** Identity Provider Single Sign-On URL. */
  ssoUrl: string;
  /** X.509 certificate (PEM-encoded) for verifying IdP signatures. */
  certificate: string;
  /** Optional Service Provider entity ID override. */
  spEntityId: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string;
}

/** Input for creating a new SSO configuration. */
export interface CreateSsoConfigInput {
  /** Customer/tenant domain. */
  domain: string;
  /** URL slug for SAML endpoints. */
  slug: string;
  /** Identity Provider entity ID URI. */
  entityId: string;
  /** Identity Provider Single Sign-On URL. */
  ssoUrl: string;
  /** X.509 certificate (PEM-encoded). */
  certificate: string;
  /** Optional Service Provider entity ID override. */
  spEntityId?: string;
}

/** Input for updating an existing SSO configuration. */
export interface UpdateSsoConfigInput {
  /** Updated customer domain. */
  domain?: string;
  /** Updated URL slug. */
  slug?: string;
  /** Updated Identity Provider entity ID. */
  entityId?: string;
  /** Updated Identity Provider SSO URL. */
  ssoUrl?: string;
  /** Updated X.509 certificate. */
  certificate?: string;
  /** Updated Service Provider entity ID. */
  spEntityId?: string;
}

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
  constructor(private http: KyInstance, private baseUrl: string) {}

  /**
   * Lists all SSO configurations. Admin only.
   *
   * @returns Array of SSO configurations
   * @throws {AuthenticationError} If not authenticated
   * @throws {AuthorizationError} If the user is not an admin
   * @throws {NetworkError} If the request fails due to network issues
   */
  async listConfigs(): Promise<SsoConfig[]> {
    try {
      return await this.http.get('admin/sso-configs').json<SsoConfig[]>();
    } catch (error) {
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
  async getConfig(id: string): Promise<SsoConfig> {
    try {
      return await this.http.get(`admin/sso-configs/${id}`).json<SsoConfig>();
    } catch (error) {
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
  async createConfig(data: CreateSsoConfigInput): Promise<SsoConfig> {
    try {
      return await this.http.post('admin/sso-configs', { json: data }).json<SsoConfig>();
    } catch (error) {
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
  async updateConfig(id: string, data: UpdateSsoConfigInput): Promise<SsoConfig> {
    try {
      return await this.http.put(`admin/sso-configs/${id}`, { json: data }).json<SsoConfig>();
    } catch (error) {
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
  async deleteConfig(id: string): Promise<void> {
    try {
      await this.http.delete(`admin/sso-configs/${id}`);
    } catch (error) {
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
  async getMetadata(slug: string): Promise<string> {
    try {
      return await this.http.get(`auth/saml/${slug}/metadata`).text();
    } catch (error) {
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
  getLoginUrl(slug: string): string {
    return `${this.baseUrl}/api/v1/auth/saml/${slug}/login`;
  }
}
