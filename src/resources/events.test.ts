import { describe, it, expect, beforeEach } from 'vitest';
import { EventsResource } from './events.js';
import { createKyMock, mockJsonResponse, mockHTTPError, mockNetworkError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError } from '../errors.js';

describe('EventsResource', () => {
  let resource: EventsResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new EventsResource(kyMock as any);
  });

  describe('list', () => {
    const page = {
      events: [
        {
          id: 'e1',
          vaultId: 'v1',
          eventType: 'document.created',
          documentPath: 'notes/a.md',
          metadata: null,
          createdAt: '2026-06-17T10:00:00.000Z',
        },
      ],
      nextCursor: null as string | null,
    };

    it('GETs the events feed with no params', async () => {
      mockJsonResponse(kyMock.get, page);

      const result = await resource.list('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/events', { searchParams: {} });
      expect(result).toEqual(page);
    });

    it('passes since, limit, and eventType as query params', async () => {
      mockJsonResponse(kyMock.get, { events: [], nextCursor: null });

      await resource.list('v1', {
        since: '2026-06-17T10:00:00.000Z',
        limit: 50,
        eventType: 'document.updated',
      });

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/events', {
        searchParams: {
          since: '2026-06-17T10:00:00.000Z',
          limit: 50,
          eventType: 'document.updated',
        },
      });
    });

    it('returns a non-null nextCursor for a full page', async () => {
      mockJsonResponse(kyMock.get, { events: page.events, nextCursor: '2026-06-17T10:00:00.000Z' });

      const result = await resource.list('v1', { limit: 1 });

      expect(result.nextCursor).toBe('2026-06-17T10:00:00.000Z');
    });

    it('maps a 404 to a NotFoundError', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Vault not found' });

      await expect(resource.list('missing')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('maps network failures to a NetworkError', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.list('v1')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
