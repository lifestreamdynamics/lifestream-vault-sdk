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

/** Resource for analytics on published documents and share links. */
export class AnalyticsResource {
  constructor(private http: KyInstance) {}

  async getPublishedSummary(): Promise<PublishedSummary> {
    try {
      return await this.http.get('analytics/published').json<PublishedSummary>();
    } catch (error) {
      throw await handleError(error, 'Analytics', '');
    }
  }

  async getShareAnalytics(vaultId: string, shareId: string): Promise<ShareAnalytics> {
    try {
      return await this.http.get(`vaults/${vaultId}/shares/${shareId}/analytics`).json<ShareAnalytics>();
    } catch (error) {
      throw await handleError(error, 'Analytics', shareId);
    }
  }

  async getPublishedDocAnalytics(vaultId: string, publishedDocId: string): Promise<PublishedDocAnalytics> {
    try {
      return await this.http.get(`vaults/${vaultId}/publish/document/${publishedDocId}/analytics`).json<PublishedDocAnalytics>();
    } catch (error) {
      throw await handleError(error, 'Analytics', publishedDocId);
    }
  }
}
