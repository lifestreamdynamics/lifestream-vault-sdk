import { beforeAll } from 'vitest';

/**
 * Integration test setup.
 * Tests that require a running API server and test database should
 * use this setup. Tests skip gracefully if TEST_API_URL or TEST_API_KEY
 * are not set.
 */

export const TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:4660';
export const TEST_API_KEY = process.env.TEST_API_KEY || '';

export function skipWithoutTestApi() {
  beforeAll(() => {
    if (!TEST_API_KEY) {
      console.warn('Skipping integration tests: TEST_API_KEY not set');
      return;
    }
  });
}

export function isIntegrationEnabled(): boolean {
  return !!TEST_API_KEY;
}
