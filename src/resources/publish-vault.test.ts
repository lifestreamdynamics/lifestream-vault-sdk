import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublishVaultResource } from './publish-vault.js';
import type { KyInstance } from 'ky';

function createKyMock() {
  const jsonFn = vi.fn();
  const responseMock = { json: jsonFn };
  return {
    get: vi.fn().mockReturnValue(responseMock),
    post: vi.fn().mockReturnValue(responseMock),
    put: vi.fn().mockReturnValue(responseMock),
    delete: vi.fn().mockReturnValue({ json: vi.fn() }),
    _json: jsonFn,
  };
}

const mockPublishedVault = {
  id: 'pv1',
  vaultId: 'v1',
  slug: 'my-site',
  title: 'My Site',
  description: null,
  showSidebar: true,
  enableSearch: true,
  isPublished: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('PublishVaultResource', () => {
  let kyMock: ReturnType<typeof createKyMock>;
  let resource: PublishVaultResource;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new PublishVaultResource(kyMock as unknown as KyInstance);
  });

  it('listMine() fetches and unwraps published vaults', async () => {
    kyMock._json.mockResolvedValue({ publishedVaults: [mockPublishedVault] });
    const result = await resource.listMine();
    expect(kyMock.get).toHaveBeenCalledWith('publish-vault/my');
    expect(result).toEqual([mockPublishedVault]);
  });

  it('publish() posts and unwraps published vault', async () => {
    kyMock._json.mockResolvedValue({ publishedVault: mockPublishedVault });
    const params = { slug: 'my-site', title: 'My Site' };
    const result = await resource.publish('v1', params);
    expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/publish-vault', { json: params });
    expect(result).toEqual(mockPublishedVault);
  });

  it('update() puts and unwraps updated published vault', async () => {
    kyMock._json.mockResolvedValue({ publishedVault: { ...mockPublishedVault, title: 'Updated' } });
    const result = await resource.update('v1', { title: 'Updated' });
    expect(kyMock.put).toHaveBeenCalledWith('vaults/v1/publish-vault', { json: { title: 'Updated' } });
    expect(result.title).toBe('Updated');
  });

  it('unpublish() sends DELETE request', async () => {
    await resource.unpublish('v1');
    expect(kyMock.delete).toHaveBeenCalledWith('vaults/v1/publish-vault');
  });

  it('listMine() propagates errors', async () => {
    kyMock._json.mockRejectedValue(new Error('network error'));
    await expect(resource.listMine()).rejects.toThrow();
  });

  it('publish() propagates errors', async () => {
    kyMock._json.mockRejectedValue(new Error('conflict'));
    await expect(resource.publish('v1', { slug: 'x', title: 'X' })).rejects.toThrow();
  });

  it('update() propagates errors', async () => {
    kyMock._json.mockRejectedValue(new Error('not found'));
    await expect(resource.update('v1', { title: 'X' })).rejects.toThrow();
  });

  it('unpublish() propagates errors', async () => {
    kyMock.delete.mockReturnValue({ json: vi.fn().mockRejectedValue(new Error('error')) });
    // delete itself throws
    kyMock.delete.mockImplementation(() => { throw new Error('delete failed'); });
    await expect(resource.unpublish('v1')).rejects.toThrow();
  });
});
