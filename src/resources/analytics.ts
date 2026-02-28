import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

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
  viewsByDay: Array<{ date: string; count: number }>;
}

/** Analytics for a published document. */
export interface PublishedDocAnalytics {
  publishedDocId: string;
  viewCount: number;
  uniqueViewers: number;
  lastViewedAt: string | null;
  viewsByDay: Array<{ date: string; count: number }>;
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
export class AnalyticsResource {
  constructor(private http: KyInstance) {}

  /**
   * Retrieves a summary of all published documents with view statistics.
   *
   * @returns Summary containing total published count, total views, and per-document breakdown
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   */
  async getPublishedSummary(): Promise<PublishedSummary> {
    try {
      return await this.http.get('analytics/published').json<PublishedSummary>();
    } catch (error) {
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
  async getShareAnalytics(vaultId: string, shareId: string): Promise<ShareAnalytics> {
    try {
      return await this.http.get(`vaults/${vaultId}/shares/${shareId}/analytics`).json<ShareAnalytics>();
    } catch (error) {
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
  async getPublishedDocAnalytics(vaultId: string, publishedDocId: string): Promise<PublishedDocAnalytics> {
    try {
      return await this.http.get(`vaults/${vaultId}/publish/document/${publishedDocId}/analytics`).json<PublishedDocAnalytics>();
    } catch (error) {
      throw await handleError(error, 'Analytics', publishedDocId);
    }
  }
}
