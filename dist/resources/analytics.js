import { handleError } from '../handle-error.js';
/**
 * Resource for analytics on published documents and share links.
 *
 * Provides view counts, unique viewer stats, and per-day breakdowns
 * for both published documents and share links.
 *
 * @example
 * ```typescript
 * const summary = await client.analytics.getPublishedSummary();
 * console.log(`Total views: ${summary.totalViews}`);
 * ```
 */
export class AnalyticsResource {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Retrieves a summary of all published documents with view statistics.
     *
     * @returns Summary containing total published count, total views, and per-document breakdown
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async getPublishedSummary() {
        try {
            return await this.http.get('analytics/published/summary').json();
        }
        catch (error) {
            throw await handleError(error, 'PublishedSummary');
        }
    }
    /**
     * Retrieves analytics for a specific share link.
     *
     * @param vaultId - Vault ID containing the share link
     * @param shareId - Share link ID
     * @returns Analytics including view count, unique viewers, and daily breakdown
     * @throws {NotFoundError} If the share link does not exist
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async getShareAnalytics(vaultId, shareId) {
        try {
            return await this.http.get(`vaults/${vaultId}/shares/${shareId}/analytics`).json();
        }
        catch (error) {
            throw await handleError(error, 'Analytics', shareId);
        }
    }
    /**
     * Retrieves analytics for a specific published document.
     *
     * @param vaultId - Vault ID containing the published document
     * @param publishedDocId - Published document ID
     * @returns Analytics including view count, unique viewers, and daily breakdown
     * @throws {NotFoundError} If the published document does not exist
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    async getPublishedDocAnalytics(vaultId, publishedDocId) {
        try {
            return await this.http.get(`analytics/vaults/${vaultId}/published/${publishedDocId}`).json();
        }
        catch (error) {
            throw await handleError(error, 'Analytics', publishedDocId);
        }
    }
}
//# sourceMappingURL=analytics.js.map