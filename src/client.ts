import ky, { type KyInstance } from 'ky';
import { VaultsResource } from './resources/vaults.js';
import { DocumentsResource } from './resources/documents.js';
import { SearchResource } from './resources/search.js';
import { AiResource } from './resources/ai.js';

export interface ClientOptions {
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  timeout?: number;
}

export class LifestreamVaultClient {
  readonly http: KyInstance;
  readonly baseUrl: string;
  readonly vaults: VaultsResource;
  readonly documents: DocumentsResource;
  readonly search: SearchResource;
  readonly ai: AiResource;

  constructor(options: ClientOptions) {
    if (!options.baseUrl) {
      throw new Error('baseUrl is required');
    }
    if (!options.apiKey && !options.accessToken) {
      throw new Error('Either apiKey or accessToken is required');
    }

    this.baseUrl = options.baseUrl.replace(/\/$/, '');

    const token = options.apiKey || options.accessToken!;

    this.http = ky.create({
      prefixUrl: `${this.baseUrl}/api/v1`,
      timeout: options.timeout || 30_000,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    this.vaults = new VaultsResource(this.http);
    this.documents = new DocumentsResource(this.http);
    this.search = new SearchResource(this.http);
    this.ai = new AiResource(this.http);
  }
}
