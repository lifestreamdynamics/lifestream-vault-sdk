import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsResource } from './analytics.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, AuthenticationError } from '../errors.js';

describe('AnalyticsResource', () => {
  let resource: AnalyticsResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new AnalyticsResource(kyMock as any);
  });

  describe('getPublishedSummary', () => {
    it('should get published summary with view stats', async () => {
      const mockSummary = {
        totalPublished: 3,
        totalViews: 1500,
        documents: [
          { id: 'p1', slug: 'my-post', title: 'My Post', viewCount: 1000, publishedAt: '2024-01-01' },
          { id: 'p2', slug: 'another-post', title: null, viewCount: 500, publishedAt: '2024-02-01' },
          { id: 'p3', slug: 'third', title: 'Third', viewCount: 0, publishedAt: '2024-03-01' },
        ],
      };
      mockJsonResponse(kyMock.get, mockSummary);

      const result = await resource.getPublishedSummary();

      expect(kyMock.get).toHaveBeenCalledWith('analytics/published');
      expect(result.totalPublished).toBe(3);
      expect(result.totalViews).toBe(1500);
      expect(result.documents).toHaveLength(3);
    });

    it('should return empty documents array when nothing published', async () => {
      const mockSummary = { totalPublished: 0, totalViews: 0, documents: [] };
      mockJsonResponse(kyMock.get, mockSummary);

      const result = await resource.getPublishedSummary();

      expect(result.totalPublished).toBe(0);
      expect(result.documents).toEqual([]);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.getPublishedSummary()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getPublishedSummary()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getShareAnalytics', () => {
    it('should get analytics for a share link', async () => {
      const mockAnalytics = {
        shareId: 'sh1',
        viewCount: 42,
        uniqueViewers: 20,
        lastViewedAt: '2024-06-01T12:00:00Z',
        viewsByDay: [
          { date: '2024-06-01', count: 10 },
          { date: '2024-06-02', count: 32 },
        ],
      };
      mockJsonResponse(kyMock.get, mockAnalytics);

      const result = await resource.getShareAnalytics('v1', 'sh1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/shares/sh1/analytics');
      expect(result.shareId).toBe('sh1');
      expect(result.viewCount).toBe(42);
      expect(result.viewsByDay).toHaveLength(2);
    });

    it('should handle a share with no views', async () => {
      const mockAnalytics = {
        shareId: 'sh2',
        viewCount: 0,
        uniqueViewers: 0,
        lastViewedAt: null,
        viewsByDay: [],
      };
      mockJsonResponse(kyMock.get, mockAnalytics);

      const result = await resource.getShareAnalytics('v1', 'sh2');

      expect(result.viewCount).toBe(0);
      expect(result.lastViewedAt).toBeNull();
      expect(result.viewsByDay).toEqual([]);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getShareAnalytics('v1', 'sh1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getPublishedDocAnalytics', () => {
    it('should get analytics for a published document', async () => {
      const mockAnalytics = {
        publishedDocId: 'p1',
        viewCount: 200,
        uniqueViewers: 150,
        lastViewedAt: '2024-06-01T10:00:00Z',
        viewsByDay: [
          { date: '2024-06-01', count: 50 },
          { date: '2024-06-02', count: 150 },
        ],
      };
      mockJsonResponse(kyMock.get, mockAnalytics);

      const result = await resource.getPublishedDocAnalytics('v1', 'p1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/publish/document/p1/analytics');
      expect(result.publishedDocId).toBe('p1');
      expect(result.viewCount).toBe(200);
      expect(result.uniqueViewers).toBe(150);
    });

    it('should handle a published doc with no views', async () => {
      const mockAnalytics = {
        publishedDocId: 'p2',
        viewCount: 0,
        uniqueViewers: 0,
        lastViewedAt: null,
        viewsByDay: [],
      };
      mockJsonResponse(kyMock.get, mockAnalytics);

      const result = await resource.getPublishedDocAnalytics('v1', 'p2');

      expect(result.viewCount).toBe(0);
      expect(result.lastViewedAt).toBeNull();
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getPublishedDocAnalytics('v1', 'p1')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
