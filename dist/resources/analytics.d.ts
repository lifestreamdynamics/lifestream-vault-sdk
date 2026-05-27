import type { KyInstance } from 'ky';
/** Summary of all published documents with view stats. */
export interface PublishedSummary {
    totalPublished: number;
    totalViews: number;
    documents: Array<{
        id: string;
        slug: string;
        title: string | null;
        viewCount: number;
        publishedAt: string;
    }>;
}
/** Analytics for a share link. */
export interface ShareAnalytics {
    shareId: string;
    viewCount: number;
    uniqueViewers: number;
    lastViewedAt: string | null;
    viewsByDay: Array<{
        date: string;
        count: number;
    }>;
}
/** Analytics for a published document. */
export interface PublishedDocAnalytics {
    publishedDocId: string;
    viewCount: number;
    uniqueViewers: number;
    lastViewedAt: string | null;
    viewsByDay: Array<{
        date: string;
        count: number;
    }>;
}
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
export declare class AnalyticsResource {
    private http;
    constructor(http: KyInstance);
    /**
     * Retrieves a summary of all published documents with view statistics.
     *
     * @returns Summary containing total published count, total views, and per-document breakdown
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     */
    getPublishedSummary(): Promise<PublishedSummary>;
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
    getShareAnalytics(vaultId: string, shareId: string): Promise<ShareAnalytics>;
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
    getPublishedDocAnalytics(vaultId: string, publishedDocId: string): Promise<PublishedDocAnalytics>;
}
//# sourceMappingURL=analytics.d.ts.map