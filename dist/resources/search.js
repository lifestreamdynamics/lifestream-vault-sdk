import { handleError } from '../handle-error.js';
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
export class SearchResource {
    http;
    constructor(http) {
        this.http = http;
    }
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
    async search(params) {
        try {
            const searchParams = { q: params.q };
            if (params.vault)
                searchParams.vault = params.vault;
            if (params.tags)
                searchParams.tags = params.tags;
            if (params.limit !== undefined)
                searchParams.limit = params.limit;
            if (params.offset !== undefined)
                searchParams.offset = params.offset;
            if (params.mode)
                searchParams.mode = params.mode;
            return await this.http.get('search', { searchParams }).json();
        }
        catch (error) {
            throw await handleError(error, 'Search', params.q);
        }
    }
    /**
     * Async generator that yields all search results, automatically handling pagination.
     *
     * @param params - Search parameters (same as search(), excluding offset)
     * @param pageSize - Number of results per page (default: 50)
     * @param signal - Optional AbortSignal to cancel the iteration mid-stream
     * @yields SearchResult objects
     */
    async *searchAll(params, pageSize = 50, signal) {
        let offset = 0;
        while (true) {
            if (signal?.aborted)
                break;
            const searchParams = { q: params.q, limit: pageSize, offset };
            if (params.vault)
                searchParams.vault = params.vault;
            if (params.tags)
                searchParams.tags = params.tags;
            if (params.mode)
                searchParams.mode = params.mode;
            try {
                const data = await this.http.get('search', { searchParams, signal }).json();
                for (const result of data.results) {
                    yield result;
                }
                if (data.results.length < pageSize)
                    break;
                offset += pageSize;
            }
            catch (error) {
                throw await handleError(error, 'Search', params.q);
            }
        }
    }
}
//# sourceMappingURL=search.js.map