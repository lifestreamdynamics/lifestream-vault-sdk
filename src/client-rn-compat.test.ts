/**
 * Regression test: LifestreamVaultClient must be constructable in environments
 * (React Native via Metro, browsers) that cannot resolve `node:fs`/`path`/`os`.
 *
 * Strategy: mock the node:* modules to throw on any access, then construct a
 * default client and exercise its resource accessors. If the audit-logger code
 * path is ever statically loaded again (e.g. someone reverts the lazy import in
 * client.ts or re-exports the class from index.ts), this test will fail because
 * audit-logger.ts does `import fs from 'node:fs'` at the top level.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('ky', () => {
  const createMock = vi.fn();
  const mock = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    create: createMock,
  };
  createMock.mockReturnValue(mock);
  return { default: mock };
});

const exploding = new Proxy({}, {
  get(_target, prop) {
    throw new Error(
      `node:* module accessed during default LifestreamVaultClient construction (property: ${String(prop)}). ` +
        `Audit-logger or other Node-only code must stay out of the static load graph.`,
    );
  },
});

vi.mock('node:fs', () => exploding);
vi.mock('node:path', () => exploding);
vi.mock('node:os', () => exploding);

describe('LifestreamVaultClient — React Native / browser bundling compatibility', () => {
  it('constructs without touching node:fs / node:path / node:os', async () => {
    const { LifestreamVaultClient } = await import('./client.js');
    expect(() => {
      const client = new LifestreamVaultClient({
        baseUrl: 'http://localhost:4660',
        accessToken: 'jwt-token',
      });
      // Touch every resource accessor — verifies none of them lazy-load Node deps either.
      void client.documents;
      void client.vaults;
      void client.search;
      void client.ai;
      void client.user;
    }).not.toThrow();
  });

  it('default barrel does not re-export the AuditLogger class', async () => {
    const barrel = await import('./index.js') as Record<string, unknown>;
    expect(barrel.AuditLogger).toBeUndefined();
  });

});
