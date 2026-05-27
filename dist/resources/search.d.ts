import type { KyInstance } from 'ky';
/** A single search result with matched document details. */
export interface SearchResult {
    /** Unique identifier of the matched document. */
    documentId: string;
    /** ID of the vault containing the document. */
    vaultId: string;
    /** Name of the vault containing the document. */
    vaultName: string;
    /** URL slug of the vault. */
    vaultSlug: string;
    /** File path of the matched document. */
    path: string;
    /** Document title, if available. */
    title: string | null;
    /** Text snippet with highlighted matches. */
    snippet: string;
    /** Tags on the matched document. */
    tags: string[];
    /** Relevance rank (higher is more relevant). */
    rank: number;
    /** ISO 8601 timestamp of the last file modification. */
    fileModifiedAt: string;
}
/** Response from a full-text search query. */
export interface SearchResponse {
    /** Array of matching documents. */
    results: SearchResult[];
    /** Total number of matching documents (for pagination). */
    total: number;
    /** The original query string. */
    query: string;
    /** The search mode used (text/semantic/hybrid). */
    mode?: string;
}
/**
 * Resource for full-text search across vaults.
 *
 * Uses PostgreSQL `websearch_to_tsquery` syntax for queries, supporting
 * natural language search, quoted phrases, and boolean operators.
 *
 * @example
 * ```typescript
 * const results = await client.search.search({ q: 'meeting notes' });
 * for (const result of results.results) {
 *   console.log(result.title, result.snippet);
 * }
 * ```
 */
export declare class SearchResource {
    private http;
    constructor(http: KyInstance);
    /**
     * Searches for documents matching a full-text query.
     *
     * Supports PostgreSQL `websearch_to_tsquery` syntax: plain words for
     * natural language matching, `"quoted phrases"` for exact matches,
     * `OR` for alternatives, and `-word` for exclusion.
     *
     * @param params - Search parameters
     * @param params.q - Search query string (required)
     * @param params.vault - Optional vault ID to restrict search to a single vault
     * @param params.tags - Optional comma-separated tag filter (e.g., `'work,urgent'`)
     * @param params.limit - Maximum number of results to return
     * @param params.offset - Number of results to skip (for pagination)
     * @param params.mode - Search mode: 'text' (full-text), 'semantic' (vector), or 'hybrid' (default: 'text')
     * @returns Search response with matching documents, total count, and the original query
     * @throws {ValidationError} If the query string is empty
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * // Simple search
     * const results = await client.search.search({ q: 'project ideas' });
     * ```
     *
     * @example
     * ```typescript
     * // Filtered and paginated search
     * const results = await client.search.search({
     *   q: '"quarterly review"',
     *   vault: 'vault-uuid',
     *   tags: 'work,reports',
     *   limit: 10,
     *   offset: 20,
     * });
     * console.log(`Showing ${results.results.length} of ${results.total}`);
     * ```
     *
     * @example
     * ```typescript
     * // Semantic search using vector similarity
     * const results = await client.search.search({
     *   q: 'documents about machine learning',
     *   mode: 'semantic',
     * });
     * ```
     */
    search(params: {
        q: string;
        vault?: string;
        tags?: string;
        limit?: number;
        offset?: number;
        mode?: 'text' | 'semantic' | 'hybrid';
    }): Promise<SearchResponse>;
    /**
     * Async generator that yields all search results, automatically handling pagination.
     *
     * @param params - Search parameters (same as search(), excluding offset)
     * @param pageSize - Number of results per page (default: 50)
     * @param signal - Optional AbortSignal to cancel the iteration mid-stream
     * @yields SearchResult objects
     */
    searchAll(params: {
        q: string;
        vault?: string;
        tags?: string;
        mode?: 'text' | 'semantic' | 'hybrid';
    }, pageSize?: number, signal?: AbortSignal): AsyncGenerator<SearchResult>;
}
//# sourceMappingURL=search.d.ts.map