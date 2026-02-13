import type { KyInstance } from 'ky';

export interface SearchResult {
  documentId: string;
  vaultId: string;
  vaultName: string;
  path: string;
  title: string | null;
  snippet: string;
  tags: string[];
  rank: number;
  fileModifiedAt: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

export class SearchResource {
  constructor(private http: KyInstance) {}

  async search(params: {
    q: string;
    vault?: string;
    tags?: string;
    limit?: number;
    offset?: number;
  }): Promise<SearchResponse> {
    const searchParams: Record<string, string | number> = { q: params.q };
    if (params.vault) searchParams.vault = params.vault;
    if (params.tags) searchParams.tags = params.tags;
    if (params.limit) searchParams.limit = params.limit;
    if (params.offset) searchParams.offset = params.offset;
    return this.http.get('search', { searchParams }).json<SearchResponse>();
  }
}
