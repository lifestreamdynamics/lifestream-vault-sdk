import { describe, it, expect, beforeAll } from 'vitest';
import { LifestreamVaultClient } from '../../client.js';
import { TEST_API_URL, TEST_API_KEY, isIntegrationEnabled } from './setup.js';

describe.skipIf(!isIntegrationEnabled())('Vaults Integration', () => {
  let client: LifestreamVaultClient;

  beforeAll(() => {
    client = new LifestreamVaultClient({
      baseUrl: TEST_API_URL,
      apiKey: TEST_API_KEY,
    });
  });

  it('should list vaults', async () => {
    const vaults = await client.vaults.list();
    expect(Array.isArray(vaults)).toBe(true);
  });

  it('should create, get, update, and delete a vault', async () => {
    // Create
    const vault = await client.vaults.create({ name: 'SDK Integration Test' });
    expect(vault.id).toBeDefined();
    expect(vault.name).toBe('SDK Integration Test');
    expect(vault.slug).toBe('sdk-integration-test');

    // Get
    const fetched = await client.vaults.get(vault.id);
    expect(fetched.id).toBe(vault.id);
    expect(fetched.name).toBe('SDK Integration Test');

    // Update
    const updated = await client.vaults.update(vault.id, {
      name: 'SDK Updated Test',
      description: 'Updated description',
    });
    expect(updated.name).toBe('SDK Updated Test');
    expect(updated.description).toBe('Updated description');

    // Delete
    await client.vaults.delete(vault.id);

    // Verify deleted
    await expect(client.vaults.get(vault.id)).rejects.toThrow();
  });
});
