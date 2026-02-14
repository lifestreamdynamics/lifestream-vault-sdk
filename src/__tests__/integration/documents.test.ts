import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LifestreamVaultClient } from '../../client.js';
import { TEST_API_URL, TEST_API_KEY, isIntegrationEnabled } from './setup.js';

describe.skipIf(!isIntegrationEnabled())('Documents Integration', () => {
  let client: LifestreamVaultClient;
  let testVaultId: string;

  beforeAll(async () => {
    client = new LifestreamVaultClient({
      baseUrl: TEST_API_URL,
      apiKey: TEST_API_KEY,
    });

    // Create a test vault
    const vault = await client.vaults.create({ name: 'SDK Doc Integration Test' });
    testVaultId = vault.id;
  });

  afterAll(async () => {
    // Clean up test vault
    if (testVaultId) {
      await client.vaults.delete(testVaultId).catch(() => {});
    }
  });

  it('should create and retrieve a document', async () => {
    const content = '# Test Document\n\nThis is test content.';

    const doc = await client.documents.put(testVaultId, 'test-doc.md', content);
    expect(doc.path).toBe('test-doc.md');

    const retrieved = await client.documents.get(testVaultId, 'test-doc.md');
    expect(retrieved.content).toBe(content);
    expect(retrieved.document.path).toBe('test-doc.md');
  });

  it('should list documents', async () => {
    const docs = await client.documents.list(testVaultId);
    expect(Array.isArray(docs)).toBe(true);
    expect(docs.length).toBeGreaterThan(0);
  });

  it('should move a document', async () => {
    await client.documents.put(testVaultId, 'movable.md', '# Movable');

    const result = await client.documents.move(testVaultId, 'movable.md', 'moved.md');
    expect(result.destination).toBe('moved.md');

    // Clean up
    await client.documents.delete(testVaultId, 'moved.md');
  });

  it('should copy a document', async () => {
    await client.documents.put(testVaultId, 'original.md', '# Original');

    const result = await client.documents.copy(testVaultId, 'original.md', 'copied.md');
    expect(result.destination).toBe('copied.md');

    // Clean up
    await client.documents.delete(testVaultId, 'original.md');
    await client.documents.delete(testVaultId, 'copied.md');
  });

  it('should delete a document', async () => {
    await client.documents.put(testVaultId, 'deletable.md', '# Delete me');
    await client.documents.delete(testVaultId, 'deletable.md');

    await expect(client.documents.get(testVaultId, 'deletable.md')).rejects.toThrow();
  });
});
