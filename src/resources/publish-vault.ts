import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

/** A published vault accessible at a public URL. */
export interface PublishedVault {
  /** Unique published vault identifier. */
  id: string;
  /** ID of the source vault. */
  vaultId: string;
  /** URL-friendly slug for the published site. */
  slug: string;
  /** Display title for the published site. */
  title: string;
  /** Optional description shown on the published site. */
  description: string | null;
  /** Whether to show the document sidebar on the published site. */
  showSidebar: boolean;
  /** Whether to enable full-text search on the published site. */
  enableSearch: boolean;
  /** Whether the vault is currently published and publicly accessible. */
  isPublished: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string;
  /** User ID of the person who published this vault. */
  publishedBy: string;
  /** Custom domain ID, or null if not using a custom domain. */
  customDomainId: string | null;
  /** Whether to show the calendar on the published site. */
  showCalendar: boolean;
  /** Theme name for the published site. */
  theme: string;
  /** Logo URL for the booking page, or null. */
  bookingLogoUrl: string | null;
  /** Accent color for the booking page, or null. */
  bookingAccentColor: string | null;
  /** Welcome message for the booking page, or null. */
  bookingWelcomeMessage: string | null;
  /** Whether to hide the "Powered by" footer. */
  hidePoweredBy: boolean;
  /** ISO 8601 timestamp when the vault was first published. */
  publishedAt: string;
}

/** Parameters for publishing or updating a published vault. */
export interface PublishVaultParams {
  /** URL-friendly slug for the published site. */
  slug: string;
  /** Display title. */
  title: string;
  /** Optional description. */
  description?: string;
  /** Show sidebar navigation. Default: true. */
  showSidebar?: boolean;
  /** Enable search. Default: true. */
  enableSearch?: boolean;
  /** Theme name. */
  theme?: string;
  /** Custom domain ID to attach. */
  customDomainId?: string;
  /** Whether to show the calendar on the published site. */
  showCalendar?: boolean;
  /** Logo URL for the booking page. */
  bookingLogoUrl?: string;
  /** Accent color for the booking page. */
  bookingAccentColor?: string;
  /** Welcome message for the booking page. */
  bookingWelcomeMessage?: string;
  /** Whether to hide the "Powered by" footer. */
  hidePoweredBy?: boolean;
}

/**
 * Resource for managing whole-vault publishing (multi-document public sites).
 *
 * Allows publishing an entire vault as a public documentation site at a
 * custom slug or domain, with configurable sidebar and search options.
 *
 * @example
 * ```typescript
 * const site = await client.publishVault.publish('vault-uuid', {
 *   slug: 'my-docs',
 *   title: 'My Documentation',
 * });
 * console.log(`Published at: https://vault.lifestreamdynamics.com/p/${site.slug}`);
 * ```
 */
export class PublishVaultResource {
  constructor(private http: KyInstance) {}

  /**
   * Lists all published vaults owned by the authenticated user.
   *
   * @returns Array of published vault objects
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async listMine(): Promise<PublishedVault[]> {
    try {
      const data = await this.http.get('publish-vault/my').json<{ publishedVaults: PublishedVault[] }>();
      return data.publishedVaults;
    } catch (error) {
      throw await handleError(error, 'PublishedVault', '');
    }
  }

  /**
   * Publishes a vault as a public multi-document site.
   *
   * @param vaultId - The ID of the vault to publish
   * @param params - Publishing configuration (slug, title, options)
   * @returns The created published vault record
   * @throws {NotFoundError} If the vault does not exist
   * @throws {ConflictError} If the slug is already in use
   * @throws {ValidationError} If the parameters are invalid
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async publish(vaultId: string, params: PublishVaultParams): Promise<PublishedVault> {
    try {
      const data = await this.http.post(`vaults/${vaultId}/publish-vault`, { json: params }).json<{ publishedVault: PublishedVault }>();
      return data.publishedVault;
    } catch (error) {
      throw await handleError(error, 'PublishedVault', vaultId);
    }
  }

  /**
   * Updates the configuration of an already-published vault.
   *
   * Only the provided fields are modified; omitted fields remain unchanged.
   *
   * @param vaultId - The ID of the vault whose published site to update
   * @param params - Fields to update (all optional)
   * @returns The updated published vault record
   * @throws {NotFoundError} If the vault or its published site does not exist
   * @throws {ConflictError} If the new slug is already in use
   * @throws {ValidationError} If the parameters are invalid
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async update(vaultId: string, params: Partial<PublishVaultParams>): Promise<PublishedVault> {
    try {
      const data = await this.http.patch(`vaults/${vaultId}/publish-vault`, { json: params }).json<{ publishedVault: PublishedVault }>();
      return data.publishedVault;
    } catch (error) {
      throw await handleError(error, 'PublishedVault', vaultId);
    }
  }

  /**
   * Unpublishes a vault, making it no longer publicly accessible.
   *
   * @param vaultId - The ID of the vault to unpublish
   * @throws {NotFoundError} If the vault or its published site does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async unpublish(vaultId: string): Promise<void> {
    try {
      await this.http.delete(`vaults/${vaultId}/publish-vault`);
    } catch (error) {
      throw await handleError(error, 'PublishedVault', vaultId);
    }
  }
}
