import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectorsResource } from './connectors.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, AuthorizationError, ValidationError } from '../errors.js';

describe('ConnectorsResource', () => {
  let resource: ConnectorsResource;
  let kyMock: KyMock;

  const mockConnector = {
    id: 'c1',
    userId: 'u1',
    vaultId: 'v1',
    provider: 'google_drive',
    name: 'My Drive',
    config: { folderId: 'abc123' },
    syncDirection: 'bidirectional',
    syncPath: null,
    lastSyncAt: null,
    status: 'active',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new ConnectorsResource(kyMock as any);
  });

  // ── List ──────────────────────────────────────────────────────────

  describe('list', () => {
    it('should list all connectors', async () => {
      mockJsonResponse(kyMock.get, [mockConnector]);

      const result = await resource.list();

      expect(kyMock.get).toHaveBeenCalledWith('connectors', { searchParams: undefined });
      expect(result).toEqual([mockConnector]);
    });

    it('should list connectors filtered by vaultId', async () => {
      mockJsonResponse(kyMock.get, [mockConnector]);

      const result = await resource.list('v1');

      expect(kyMock.get).toHaveBeenCalledWith('connectors', { searchParams: { vaultId: 'v1' } });
      expect(result).toEqual([mockConnector]);
    });

    it('should return empty array when no connectors', async () => {
      mockJsonResponse(kyMock.get, []);

      const result = await resource.list();

      expect(result).toEqual([]);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.list()).rejects.toBeInstanceOf(NetworkError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.get, 403, { message: 'Feature not available' });

      await expect(resource.list()).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  // ── Get ───────────────────────────────────────────────────────────

  describe('get', () => {
    it('should get a connector by id', async () => {
      mockJsonResponse(kyMock.get, mockConnector);

      const result = await resource.get('c1');

      expect(kyMock.get).toHaveBeenCalledWith('connectors/c1');
      expect(result).toEqual(mockConnector);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Connector not found' });

      await expect(resource.get('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.get('c1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── Create ────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a connector with required fields', async () => {
      mockJsonResponse(kyMock.post, mockConnector);

      const params = {
        provider: 'google_drive' as const,
        name: 'My Drive',
        vaultId: 'v1',
        syncDirection: 'bidirectional' as const,
      };
      const result = await resource.create(params);

      expect(kyMock.post).toHaveBeenCalledWith('connectors', { json: params });
      expect(result).toEqual(mockConnector);
    });

    it('should create a connector with all optional fields', async () => {
      mockJsonResponse(kyMock.post, { ...mockConnector, syncPath: '/docs' });

      const params = {
        provider: 'google_drive' as const,
        name: 'My Drive',
        vaultId: 'v1',
        syncDirection: 'pull' as const,
        syncPath: '/docs',
        config: { folderId: 'abc123' },
      };
      const result = await resource.create(params);

      expect(kyMock.post).toHaveBeenCalledWith('connectors', { json: params });
      expect(result.syncPath).toBe('/docs');
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Invalid provider' });

      await expect(resource.create({
        provider: 'google_drive',
        name: '',
        vaultId: 'v1',
        syncDirection: 'pull',
      })).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.post, 403, { message: 'Feature not available' });

      await expect(resource.create({
        provider: 'google_drive',
        name: 'Drive',
        vaultId: 'v1',
        syncDirection: 'pull',
      })).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  // ── Update ────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update connector name', async () => {
      const updated = { ...mockConnector, name: 'Renamed Drive' };
      mockJsonResponse(kyMock.put, updated);

      const result = await resource.update('c1', { name: 'Renamed Drive' });

      expect(kyMock.put).toHaveBeenCalledWith('connectors/c1', { json: { name: 'Renamed Drive' } });
      expect(result.name).toBe('Renamed Drive');
    });

    it('should update sync direction', async () => {
      const updated = { ...mockConnector, syncDirection: 'push' };
      mockJsonResponse(kyMock.put, updated);

      const result = await resource.update('c1', { syncDirection: 'push' });

      expect(kyMock.put).toHaveBeenCalledWith('connectors/c1', { json: { syncDirection: 'push' } });
      expect(result.syncDirection).toBe('push');
    });

    it('should deactivate a connector', async () => {
      const updated = { ...mockConnector, isActive: false };
      mockJsonResponse(kyMock.put, updated);

      const result = await resource.update('c1', { isActive: false });

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.put, 404, { message: 'Connector not found' });

      await expect(resource.update('nonexistent', { name: 'X' })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.put, 400, { message: 'Invalid sync direction' });

      await expect(resource.update('c1', { syncDirection: 'pull' })).rejects.toBeInstanceOf(ValidationError);
    });
  });

  // ── Delete ────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should delete a connector', async () => {
      await resource.delete('c1');

      expect(kyMock.delete).toHaveBeenCalledWith('connectors/c1');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Connector not found' });

      await expect(resource.delete('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.delete('c1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── Test Connection ───────────────────────────────────────────────

  describe('test', () => {
    it('should test connection successfully', async () => {
      mockJsonResponse(kyMock.post, { success: true });

      const result = await resource.test('c1');

      expect(kyMock.post).toHaveBeenCalledWith('connectors/c1/test');
      expect(result).toEqual({ success: true });
    });

    it('should return failure with error message', async () => {
      mockJsonResponse(kyMock.post, { success: false, error: 'Invalid credentials' });

      const result = await resource.test('c1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.post, 404, { message: 'Connector not found' });

      await expect(resource.test('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.test('c1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── Trigger Sync ──────────────────────────────────────────────────

  describe('sync', () => {
    it('should trigger sync successfully', async () => {
      mockJsonResponse(kyMock.post, { message: 'Sync triggered successfully' });

      const result = await resource.sync('c1');

      expect(kyMock.post).toHaveBeenCalledWith('connectors/c1/sync');
      expect(result.message).toBe('Sync triggered successfully');
    });

    it('should throw ValidationError when connector is inactive', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Cannot sync an inactive connector' });

      await expect(resource.sync('c1')).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.post, 404, { message: 'Connector not found' });

      await expect(resource.sync('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── Sync Logs ─────────────────────────────────────────────────────

  describe('logs', () => {
    it('should get sync logs', async () => {
      const mockLogs = [
        {
          id: 'log1',
          connectorId: 'c1',
          status: 'success',
          filesAdded: 5,
          filesUpdated: 2,
          filesDeleted: 0,
          errors: null,
          durationMs: 1234,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      mockJsonResponse(kyMock.get, mockLogs);

      const result = await resource.logs('c1');

      expect(kyMock.get).toHaveBeenCalledWith('connectors/c1/logs');
      expect(result).toEqual(mockLogs);
      expect(result[0].filesAdded).toBe(5);
    });

    it('should return empty array when no logs', async () => {
      mockJsonResponse(kyMock.get, []);

      const result = await resource.logs('c1');

      expect(result).toEqual([]);
    });

    it('should handle logs with errors', async () => {
      const mockLogs = [
        {
          id: 'log2',
          connectorId: 'c1',
          status: 'error',
          filesAdded: 0,
          filesUpdated: 0,
          filesDeleted: 0,
          errors: [{ file: 'test.md', message: 'Permission denied' }],
          durationMs: 500,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      mockJsonResponse(kyMock.get, mockLogs);

      const result = await resource.logs('c1');

      expect(result[0].errors).toHaveLength(1);
      expect(result[0].status).toBe('error');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Connector not found' });

      await expect(resource.logs('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.logs('c1')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
