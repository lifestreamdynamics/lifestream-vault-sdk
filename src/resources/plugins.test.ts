import { describe, it, expect, beforeEach } from 'vitest';
import { PluginsResource } from './plugins.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, AuthenticationError, ConflictError, ValidationError } from '../errors.js';

describe('PluginsResource', () => {
  let resource: PluginsResource;
  let kyMock: KyMock;

  const mockPlugin = {
    id: 'install-1',
    pluginId: 'org/my-plugin',
    version: '1.0.0',
    enabled: true,
    settings: {},
    installedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new PluginsResource(kyMock as any);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should return array of installed plugins', async () => {
      mockJsonResponse(kyMock.get, [mockPlugin]);

      const result = await resource.list();

      expect(kyMock.get).toHaveBeenCalledWith('plugins');
      expect(result).toEqual([mockPlugin]);
    });

    it('should return empty array when no plugins installed', async () => {
      mockJsonResponse(kyMock.get, []);

      const result = await resource.list();

      expect(result).toEqual([]);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.list()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.list()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── install ───────────────────────────────────────────────────────────────

  describe('install', () => {
    it('should install a plugin and return the record', async () => {
      mockJsonResponse(kyMock.post, mockPlugin);

      const input = { pluginId: 'org/my-plugin', version: '1.0.0' };
      const result = await resource.install(input);

      expect(kyMock.post).toHaveBeenCalledWith('plugins', { json: input });
      expect(result).toEqual(mockPlugin);
    });

    it('should throw ValidationError on invalid input', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Invalid request' });

      await expect(resource.install({ pluginId: '', version: '' })).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw ConflictError when plugin is already installed', async () => {
      mockHTTPError(kyMock.post, 409, { message: 'Plugin already installed' });

      await expect(resource.install({ pluginId: 'org/my-plugin', version: '1.0.0' })).rejects.toBeInstanceOf(ConflictError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.install({ pluginId: 'org/my-plugin', version: '1.0.0' })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── uninstall ─────────────────────────────────────────────────────────────

  describe('uninstall', () => {
    it('should call correct endpoint with encoded pluginId', async () => {
      await resource.uninstall('org/my-plugin');

      expect(kyMock.delete).toHaveBeenCalledWith('plugins/org%2Fmy-plugin');
    });

    it('should throw NotFoundError when plugin is not installed', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Plugin not found' });

      await expect(resource.uninstall('org/missing')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.uninstall('org/my-plugin')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── enable ────────────────────────────────────────────────────────────────

  describe('enable', () => {
    it('should enable a plugin and return updated record', async () => {
      mockJsonResponse(kyMock.patch, { ...mockPlugin, enabled: true });

      const result = await resource.enable('org/my-plugin');

      expect(kyMock.patch).toHaveBeenCalledWith('plugins/org%2Fmy-plugin', { json: { enabled: true } });
      expect(result.enabled).toBe(true);
    });

    it('should throw NotFoundError when plugin does not exist', async () => {
      mockHTTPError(kyMock.patch, 404, { message: 'Plugin not found' });

      await expect(resource.enable('org/missing')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.patch);

      await expect(resource.enable('org/my-plugin')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── disable ───────────────────────────────────────────────────────────────

  describe('disable', () => {
    it('should disable a plugin and return updated record', async () => {
      mockJsonResponse(kyMock.patch, { ...mockPlugin, enabled: false });

      const result = await resource.disable('org/my-plugin');

      expect(kyMock.patch).toHaveBeenCalledWith('plugins/org%2Fmy-plugin', { json: { enabled: false } });
      expect(result.enabled).toBe(false);
    });

    it('should throw NotFoundError when plugin does not exist', async () => {
      mockHTTPError(kyMock.patch, 404, { message: 'Plugin not found' });

      await expect(resource.disable('org/missing')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── updateSettings ────────────────────────────────────────────────────────

  describe('updateSettings', () => {
    it('should update plugin settings and return updated record', async () => {
      const settings = { apiKey: 'my-key', theme: 'dark' };
      mockJsonResponse(kyMock.patch, { ...mockPlugin, settings });

      const result = await resource.updateSettings('org/my-plugin', settings);

      expect(kyMock.patch).toHaveBeenCalledWith('plugins/org%2Fmy-plugin', { json: { settings } });
      expect(result.settings).toEqual(settings);
    });

    it('should throw NotFoundError when plugin does not exist', async () => {
      mockHTTPError(kyMock.patch, 404, { message: 'Plugin not found' });

      await expect(resource.updateSettings('org/missing', {})).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.patch);

      await expect(resource.updateSettings('org/my-plugin', {})).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
