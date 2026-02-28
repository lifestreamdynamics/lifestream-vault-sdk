import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** A SCIM 2.0 User resource. */
export interface ScimUser {
  /** SCIM schemas array. */
  schemas: string[];
  /** Internal user ID. */
  id: string;
  /** User login name (email). */
  userName: string;
  /** Structured name object. */
  name: {
    /** Formatted full name. */
    formatted: string;
    /** First/given name. */
    givenName: string;
    /** Last/family name. */
    familyName: string;
  };
  /** Email addresses array. */
  emails: Array<{ value: string; primary?: boolean }>;
  /** Whether the account is active. */
  active: boolean;
  /** External IdP subject ID, if set. */
  externalId?: string;
  /** SCIM metadata. */
  meta: {
    /** Resource type string. */
    resourceType: string;
    /** ISO 8601 creation timestamp. */
    created: string;
    /** ISO 8601 last-modified timestamp. */
    lastModified: string;
    /** Canonical resource location URL. */
    location: string;
  };
}

/** SCIM 2.0 List Response envelope. */
export interface ScimListResponse {
  /** SCIM schemas array. */
  schemas: string[];
  /** Total number of results matching the query. */
  totalResults: number;
  /** 1-based start index. */
  startIndex: number;
  /** Number of items returned. */
  itemsPerPage: number;
  /** Array of SCIM User resources. */
  Resources: ScimUser[];
}

/** Input for provisioning a new SCIM user. */
export interface ScimCreateUserInput {
  /** Login name (email). Required when creating a user. */
  userName: string;
  /** Structured name. */
  name?: {
    /** Given/first name. */
    givenName?: string;
    /** Family/last name. */
    familyName?: string;
    /** Pre-formatted full name. */
    formatted?: string;
  };
  /** Email addresses. */
  emails?: Array<{ value: string; primary?: boolean }>;
  /** Whether the account is active. */
  active?: boolean;
  /** External IdP subject ID. */
  externalId?: string;
}

/** Input for updating a SCIM user (full replace). */
export interface ScimUpdateUserInput {
  /** Login name (email). */
  userName?: string;
  /** Structured name. */
  name?: {
    /** Given/first name. */
    givenName?: string;
    /** Family/last name. */
    familyName?: string;
    /** Pre-formatted full name. */
    formatted?: string;
  };
  /** Email addresses. */
  emails?: Array<{ value: string; primary?: boolean }>;
  /** Whether the account is active. */
  active?: boolean;
}

/** SCIM Service Provider configuration object. */
export interface ScimServiceProviderConfig {
  /** SCIM schemas array. */
  schemas: string[];
  /** PATCH operation support. */
  patch: { supported: boolean };
  /** Bulk operation support. */
  bulk: { supported: boolean; maxOperations: number; maxPayloadSize: number };
  /** Filter support. */
  filter: { supported: boolean; maxResults: number };
  /** Password change support. */
  changePassword: { supported: boolean };
  /** Sorting support. */
  sort: { supported: boolean };
  /** ETag support. */
  etag: { supported: boolean };
  /** Supported authentication schemes. */
  authenticationSchemes: Array<Record<string, unknown>>;
}

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
  constructor(private http: KyInstance) {}

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
  async listUsers(params?: {
    filter?: string;
    startIndex?: number;
    count?: number;
  }): Promise<ScimListResponse> {
    try {
      const searchParams: Record<string, string | number> = {};
      if (params?.filter) searchParams.filter = params.filter;
      if (params?.startIndex !== undefined) searchParams.startIndex = params.startIndex;
      if (params?.count !== undefined) searchParams.count = params.count;

      return await this.http.get('Users', {
        searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
      }).json<ScimListResponse>();
    } catch (error) {
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
  async getUser(id: string): Promise<ScimUser> {
    try {
      return await this.http.get(`Users/${id}`).json<ScimUser>();
    } catch (error) {
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
  async createUser(data: ScimCreateUserInput): Promise<ScimUser> {
    try {
      return await this.http.post('Users', { json: data }).json<ScimUser>();
    } catch (error) {
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
  async updateUser(id: string, data: ScimUpdateUserInput): Promise<ScimUser> {
    try {
      return await this.http.put(`Users/${id}`, { json: data }).json<ScimUser>();
    } catch (error) {
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
  async deleteUser(id: string): Promise<void> {
    try {
      await this.http.delete(`Users/${id}`);
    } catch (error) {
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
  async getServiceProviderConfig(): Promise<ScimServiceProviderConfig> {
    try {
      return await this.http.get('ServiceProviderConfig').json<ScimServiceProviderConfig>();
    } catch (error) {
      throw await handleError(error, 'ScimServiceProviderConfig', '');
    }
  }
}
