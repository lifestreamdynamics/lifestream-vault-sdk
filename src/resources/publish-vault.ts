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
}

/** Resource for managing whole-vault publishing (multi-document public sites). */
export class PublishVaultResource {
  constructor(private http: KyInstance) {}

  async listMine(): Promise<PublishedVault[]> {
    try {
      const data = await this.http.get('publish-vault/my').json<{ publishedVaults: PublishedVault[] }>();
      return data.publishedVaults;
    } catch (error) {
      throw await handleError(error, 'PublishVault', '');
    }
  }

  async publish(vaultId: string, params: PublishVaultParams): Promise<PublishedVault> {
    try {
      const data = await this.http.post(`vaults/${vaultId}/publish-vault`, { json: params }).json<{ publishedVault: PublishedVault }>();
      return data.publishedVault;
    } catch (error) {
      throw await handleError(error, 'PublishVault', vaultId);
    }
  }

  async update(vaultId: string, params: Partial<PublishVaultParams>): Promise<PublishedVault> {
    try {
      const data = await this.http.put(`vaults/${vaultId}/publish-vault`, { json: params }).json<{ publishedVault: PublishedVault }>();
      return data.publishedVault;
    } catch (error) {
      throw await handleError(error, 'PublishVault', vaultId);
    }
  }

  async unpublish(vaultId: string): Promise<void> {
    try {
      await this.http.delete(`vaults/${vaultId}/publish-vault`);
    } catch (error) {
      throw await handleError(error, 'PublishVault', vaultId);
    }
  }
}
