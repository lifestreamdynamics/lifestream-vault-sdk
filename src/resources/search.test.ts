import { describe, it, expect, beforeEach } from 'vitest';
import { SearchResource } from './search.js';
import { createKyMock, mockJsonResponse, mockNetworkError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError } from '../errors.js';

describe('SearchResource', () => {
  let resource: SearchResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new SearchResource(kyMock as any);
  });

  describe('search', () => {
    it('should search with query only', async () => {
      const mockResponse = {
        results: [
          {
            documentId: 'd1', vaultId: 'v1', vaultName: 'Main', path: 'hello.md',
            title: 'Hello', snippet: '...match...', tags: [], rank: 0.9, fileModifiedAt: '2024-01-01',
          },
        ],
        total: 1,
        query: 'hello',
      };
      mockJsonResponse(kyMock.get, mockResponse);

      const result = await resource.search({ q: 'hello' });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'hello' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should search with vault filter', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 0, query: 'test' });

      await resource.search({ q: 'test', vault: 'v1' });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'test', vault: 'v1' },
      });
    });

    it('should search with tags filter', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 0, query: 'tagged' });

      await resource.search({ q: 'tagged', tags: 'javascript,typescript' });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'tagged', tags: 'javascript,typescript' },
      });
    });

    it('should search with pagination', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 50, query: 'lots' });

      await resource.search({ q: 'lots', limit: 10, offset: 20 });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'lots', limit: 10, offset: 20 },
      });
    });

    it('should search with all parameters', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 0, query: 'all' });

      await resource.search({ q: 'all', vault: 'v2', tags: 'tag1', limit: 5, offset: 10 });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'all', vault: 'v2', tags: 'tag1', limit: 5, offset: 10 },
      });
    });

    it('should not include undefined optional params', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 0, query: 'clean' });

      await resource.search({ q: 'clean', vault: undefined, tags: undefined });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'clean' },
      });
    });

    it('should search with mode parameter', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 0, query: 'ml', mode: 'semantic' });

      await resource.search({ q: 'ml', mode: 'semantic' });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'ml', mode: 'semantic' },
      });
    });

    it('should search with hybrid mode', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 0, query: 'test', mode: 'hybrid' });

      await resource.search({ q: 'test', mode: 'hybrid' });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'test', mode: 'hybrid' },
      });
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.search({ q: 'fail' })).rejects.toBeInstanceOf(NetworkError);
      await expect(resource.search({ q: 'fail' })).rejects.toThrow('Network request failed');
    });
  });
});
