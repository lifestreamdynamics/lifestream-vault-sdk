/**
 * Resource for real-time collaborative editing WebSocket URL generation.
 *
 * This resource provides a pure URL builder for connecting to the
 * WebSocket collaboration server. No HTTP calls are made.
 *
 * @example
 * ```typescript
 * const wsUrl = client.collaboration.getWebSocketUrl('vault-id', 'docs/notes.md');
 * const ws = new WebSocket(wsUrl);
 * ```
 */
export class CollaborationResource {
  constructor(private baseUrl: string) {}

  /**
   * Returns the WebSocket URL for connecting to a collaborative editing session.
   *
   * Converts the base URL from HTTP(S) to WS(S) automatically.
   *
   * @param vaultId - Vault ID containing the document
   * @param docPath - Document path (e.g. `notes/meeting.md`)
   * @returns WebSocket URL string (e.g. `wss://vault.example.com/collab/vault-id/notes/meeting.md`)
   *
   * @example
   * ```typescript
   * const url = client.collaboration.getWebSocketUrl('vault-123', 'notes/meeting.md');
   * // => 'wss://vault.lifestreamdynamics.com/collab/vault-123/notes/meeting.md'
   * ```
   */
  getWebSocketUrl(vaultId: string, docPath: string): string {
    const wsUrl = this.baseUrl
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://');
    return `${wsUrl}/collab/${vaultId}/${docPath}`;
  }
}
