import { describe, it, expect } from 'vitest';
import { CollaborationResource } from './collaboration.js';

describe('CollaborationResource', () => {
  // ── getWebSocketUrl ───────────────────────────────────────────────────────

  describe('getWebSocketUrl', () => {
    it('should convert https to wss and build correct URL', () => {
      const resource = new CollaborationResource('https://vault.example.com');

      const url = resource.getWebSocketUrl('vault-123', 'notes/meeting.md');

      expect(url).toBe('wss://vault.example.com/collab/vault-123/notes/meeting.md');
    });

    it('should convert http to ws for non-TLS environments', () => {
      const resource = new CollaborationResource('http://localhost:4660');

      const url = resource.getWebSocketUrl('vault-abc', 'doc.md');

      expect(url).toBe('ws://localhost:4660/collab/vault-abc/doc.md');
    });

    it('should handle nested document paths', () => {
      const resource = new CollaborationResource('https://vault.example.com');

      const url = resource.getWebSocketUrl('vault-1', 'folder/subfolder/deep.md');

      expect(url).toBe('wss://vault.example.com/collab/vault-1/folder/subfolder/deep.md');
    });

    it('should use the default production URL', () => {
      const resource = new CollaborationResource('https://vault.lifestreamdynamics.com');

      const url = resource.getWebSocketUrl('vault-x', 'readme.md');

      expect(url).toBe('wss://vault.lifestreamdynamics.com/collab/vault-x/readme.md');
    });
  });
});
