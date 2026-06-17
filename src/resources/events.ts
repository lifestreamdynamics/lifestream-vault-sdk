import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

/**
 * A single vault event in the incremental change feed.
 *
 * Mirrors the server's `vault_events` row. `eventType` is one of the vault
 * event-type strings (e.g. `'document.created'`, `'document.updated'`).
 */
export interface VaultEvent {
  /** Unique event identifier. */
  id: string;
  /** ID of the vault the event belongs to. */
  vaultId: string;
  /** The event type (e.g. `'document.created'`). */
  eventType: string;
  /** Path of the document the event concerns, if applicable. */
  documentPath: string | null;
  /** Arbitrary structured metadata recorded with the event. */
  metadata: Record<string, unknown> | null;
  /** ISO 8601 timestamp when the event was recorded. */
  createdAt: string;
}

/** Options for {@link EventsResource.list}. */
export interface EventsListOptions {
  /**
   * Cursor for incremental polling: an ISO-8601 timestamp (the `nextCursor`
   * returned by a previous call). Only events strictly after it are returned.
   * Omit on the first call to start from the beginning of the retained window.
   */
  since?: string;
  /** Page size, 1–500. Defaults to 100 server-side. */
  limit?: number;
  /** Restrict to a single event type (e.g. `'document.created'`). */
  eventType?: string;
}

/**
 * Result of {@link EventsResource.list}.
 *
 * `nextCursor` is non-null whenever a full page was returned — pass it back as
 * `since` to fetch the next page. It becomes `null` once a page returns fewer
 * than `limit` events, signalling the caller is caught up. A caller polling for
 * "is there anything new" therefore makes one final call that returns an empty
 * `events` array and `nextCursor: null`.
 */
export interface EventsListResult {
  /** The events in this page, oldest first. */
  events: VaultEvent[];
  /** Cursor for the next page, or `null` when caught up. */
  nextCursor: string | null;
}

/**
 * Resource for reading a vault's incremental change feed.
 *
 * The `vault_events` table records document CRUD and calendar/booking events.
 * Polling `list({ since })` with the previous `nextCursor` lets a sync client
 * receive only the deltas since its last poll instead of re-listing the vault.
 *
 * @example
 * ```typescript
 * let cursor: string | undefined;
 * for (;;) {
 *   const { events, nextCursor } = await client.events.list(vaultId, { since: cursor });
 *   for (const e of events) console.log(e.eventType, e.documentPath);
 *   if (nextCursor === null) break; // caught up
 *   cursor = nextCursor;
 * }
 * ```
 */
export class EventsResource {
  constructor(private http: KyInstance) {}

  /**
   * Lists vault events after the given cursor, oldest first.
   *
   * @param vaultId - The vault to read events from
   * @param options - Incremental cursor (`since`), page size (`limit`), and optional `eventType` filter
   * @returns A page of events plus the cursor for the next page (`null` when caught up)
   * @throws {ValidationError} If `since` is not a valid ISO-8601 timestamp or `limit` is out of range
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {NotFoundError} If the vault does not exist or is not accessible
   */
  async list(vaultId: string, options?: EventsListOptions): Promise<EventsListResult> {
    try {
      const searchParams: Record<string, string | number> = {};
      if (options?.since !== undefined) searchParams.since = options.since;
      if (options?.limit !== undefined) searchParams.limit = options.limit;
      if (options?.eventType !== undefined) searchParams.eventType = options.eventType;
      return await this.http
        .get(`vaults/${vaultId}/events`, { searchParams })
        .json<EventsListResult>();
    } catch (error) {
      throw await handleError(error, 'Vault', vaultId);
    }
  }
}
