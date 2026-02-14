import { describe, it, expect, beforeEach } from 'vitest';
import { HooksResource } from './hooks.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, AuthenticationError, ValidationError, AuthorizationError } from '../errors.js';

describe('HooksResource', () => {
  let resource: HooksResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new HooksResource(kyMock as any);
  });

  describe('list', () => {
    it('should list hooks for a vault', async () => {
      const mockHooks = [
        {
          id: 'h1', vaultId: 'v1', name: 'Auto-tag', triggerEvent: 'document.create',
          triggerFilter: null, actionType: 'auto-tag', actionConfig: { tags: ['new'] },
          isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01',
        },
      ];
      mockJsonResponse(kyMock.get, { hooks: mockHooks });

      const result = await resource.list('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/hooks');
      expect(result).toEqual(mockHooks);
    });

    it('should return empty array when no hooks exist', async () => {
      mockJsonResponse(kyMock.get, { hooks: [] });

      const result = await resource.list('v1');

      expect(result).toEqual([]);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.list('v1')).rejects.toBeInstanceOf(NetworkError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.list('v1')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.get, 403, { message: 'Forbidden' });

      await expect(resource.list('v1')).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe('create', () => {
    it('should create a hook with all params', async () => {
      const mockHook = {
        id: 'h1', vaultId: 'v1', name: 'Auto-tag', triggerEvent: 'document.create',
        triggerFilter: { path: '*.md' }, actionType: 'auto-tag', actionConfig: { tags: ['new'] },
        isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01',
      };
      mockJsonResponse(kyMock.post, mockHook);

      const result = await resource.create('v1', {
        name: 'Auto-tag',
        triggerEvent: 'document.create',
        triggerFilter: { path: '*.md' },
        actionType: 'auto-tag',
        actionConfig: { tags: ['new'] },
      });

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/hooks', {
        json: {
          name: 'Auto-tag',
          triggerEvent: 'document.create',
          triggerFilter: { path: '*.md' },
          actionType: 'auto-tag',
          actionConfig: { tags: ['new'] },
        },
      });
      expect(result).toEqual(mockHook);
    });

    it('should create a hook with minimal params', async () => {
      const mockHook = {
        id: 'h2', vaultId: 'v1', name: 'Template', triggerEvent: 'document.create',
        triggerFilter: null, actionType: 'template', actionConfig: { template: 'default' },
        isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01',
      };
      mockJsonResponse(kyMock.post, mockHook);

      const result = await resource.create('v1', {
        name: 'Template',
        triggerEvent: 'document.create',
        actionType: 'template',
        actionConfig: { template: 'default' },
      });

      expect(result).toEqual(mockHook);
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Invalid request' });

      await expect(resource.create('v1', {
        name: '', triggerEvent: '', actionType: '', actionConfig: {},
      })).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.post, 401, { message: 'Unauthorized' });

      await expect(resource.create('v1', {
        name: 'Hook', triggerEvent: 'document.create', actionType: 'auto-tag', actionConfig: {},
      })).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.create('v1', {
        name: 'Hook', triggerEvent: 'document.create', actionType: 'auto-tag', actionConfig: {},
      })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('update', () => {
    it('should update a hook', async () => {
      const mockHook = {
        id: 'h1', vaultId: 'v1', name: 'Renamed', triggerEvent: 'document.create',
        triggerFilter: null, actionType: 'auto-tag', actionConfig: { tags: ['new'] },
        isActive: false, createdAt: '2024-01-01', updatedAt: '2024-01-02',
      };
      mockJsonResponse(kyMock.put, mockHook);

      const result = await resource.update('v1', 'h1', { name: 'Renamed', isActive: false });

      expect(kyMock.put).toHaveBeenCalledWith('vaults/v1/hooks/h1', {
        json: { name: 'Renamed', isActive: false },
      });
      expect(result).toEqual(mockHook);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.put, 404, { message: 'Hook not found' });

      await expect(resource.update('v1', 'nonexistent', { name: 'X' })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.put, 400, { message: 'Invalid' });

      await expect(resource.update('v1', 'h1', { name: '' })).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.put);

      await expect(resource.update('v1', 'h1', { name: 'X' })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('delete', () => {
    it('should delete a hook', async () => {
      await resource.delete('v1', 'h1');

      expect(kyMock.delete).toHaveBeenCalledWith('vaults/v1/hooks/h1');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Hook not found' });

      await expect(resource.delete('v1', 'nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.delete, 403, { message: 'Forbidden' });

      await expect(resource.delete('v1', 'h1')).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.delete('v1', 'h1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('listExecutions', () => {
    it('should list executions for a hook', async () => {
      const mockExecutions = [
        {
          id: 'e1', hookId: 'h1', eventId: 'ev1', status: 'success',
          durationMs: 42, result: { tagged: true }, error: null, createdAt: '2024-01-01',
        },
        {
          id: 'e2', hookId: 'h1', eventId: 'ev2', status: 'error',
          durationMs: 100, result: null, error: 'Template not found', createdAt: '2024-01-02',
        },
      ];
      mockJsonResponse(kyMock.get, { executions: mockExecutions });

      const result = await resource.listExecutions('v1', 'h1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/hooks/h1/executions');
      expect(result).toEqual(mockExecutions);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('success');
      expect(result[1].error).toBe('Template not found');
    });

    it('should return empty array when no executions exist', async () => {
      mockJsonResponse(kyMock.get, { executions: [] });

      const result = await resource.listExecutions('v1', 'h1');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Hook not found' });

      await expect(resource.listExecutions('v1', 'nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.listExecutions('v1', 'h1')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listExecutions('v1', 'h1')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
