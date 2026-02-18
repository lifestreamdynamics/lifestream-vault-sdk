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

/** Resource for managing custom domains for published vaults. */
export class CustomDomainsResource {
  constructor(private http: KyInstance) {}

  async list(): Promise<CustomDomain[]> {
    try {
      const data = await this.http.get('custom-domains').json<{ domains: CustomDomain[] }>();
      return data.domains;
    } catch (error) {
      throw await handleError(error, 'CustomDomain', '');
    }
  }

  async create(params: { domain: string }): Promise<CustomDomain> {
    try {
      const data = await this.http.post('custom-domains', { json: params }).json<{ domain: CustomDomain }>();
      return data.domain;
    } catch (error) {
      throw await handleError(error, 'CustomDomain', params.domain);
    }
  }

  async get(domainId: string): Promise<CustomDomain> {
    try {
      const data = await this.http.get(`custom-domains/${domainId}`).json<{ domain: CustomDomain }>();
      return data.domain;
    } catch (error) {
      throw await handleError(error, 'CustomDomain', domainId);
    }
  }

  async update(domainId: string, params: { domain: string }): Promise<CustomDomain> {
    try {
      const data = await this.http.patch(`custom-domains/${domainId}`, { json: params }).json<{ domain: CustomDomain }>();
      return data.domain;
    } catch (error) {
      throw await handleError(error, 'CustomDomain', domainId);
    }
  }

  async delete(domainId: string): Promise<void> {
    try {
      await this.http.delete(`custom-domains/${domainId}`);
    } catch (error) {
      throw await handleError(error, 'CustomDomain', domainId);
    }
  }

  async verify(domainId: string): Promise<CustomDomain> {
    try {
      const data = await this.http.post(`custom-domains/${domainId}/verify`).json<{ domain: CustomDomain }>();
      return data.domain;
    } catch (error) {
      throw await handleError(error, 'CustomDomain', domainId);
    }
  }

  async checkDns(domainId: string): Promise<DnsCheckResult> {
    try {
      return await this.http.get(`custom-domains/${domainId}/check`).json<DnsCheckResult>();
    } catch (error) {
      throw await handleError(error, 'CustomDomain', domainId);
    }
  }
}
