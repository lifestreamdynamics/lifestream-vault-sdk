import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

export interface RecurrenceRule {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  days?: string[];
  monthWeek?: number;
  endDate?: string;
  count?: number;
}

export interface CalendarEvent {
  id: string;
  vaultId: string;
  userId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  recurrenceRule?: RecurrenceRule;
  completed: boolean;
  priority?: string;
  color?: string;
  backingFilePath?: string;
  status?: string;
  timezone?: string;
  location?: string;
  metadata?: unknown;
  isPublic?: boolean;
  maxAttendees?: number;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DueDocument {
  documentId: string;
  path: string;
  title?: string;
  dueAt: string;
  priority?: string;
  completed: boolean;
  overdue: boolean;
}

export interface CalendarDayData {
  date: string;
  activityCount: number;
  events: CalendarEvent[];
  dueDocs: DueDocument[];
}

export interface CalendarActivityDay {
  date: string;
  created: number;
  updated: number;
  deleted: number;
  total: number;
}

export interface CalendarResponse {
  days: Record<string, CalendarDayData>;
  start: string;
  end: string;
}

export interface CalendarActivityResponse {
  days: CalendarActivityDay[];
  start: string;
  end: string;
}

export interface AgendaGroup {
  label: string;
  items: DueDocument[];
}

export interface AgendaResponse {
  groups: AgendaGroup[];
  total: number;
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  recurrenceRule?: RecurrenceRule;
  priority?: string;
  color?: string;
}

/**
 * Resource for calendar, activity, and due date operations.
 *
 * Provides methods to view calendar activity, manage calendar events,
 * and track document due dates within a vault.
 *
 * @example
 * ```typescript
 * const activity = await client.calendar.getActivity('vault-id', {
 *   start: '2024-01-01',
 *   end: '2024-01-31',
 * });
 * for (const day of activity.days) {
 *   console.log(day.date, day.total);
 * }
 * ```
 */
export class CalendarResource {
  constructor(private http: KyInstance) {}

  /**
   * Get calendar data for a vault within a date range.
   *
   * @param vaultId - Vault ID
   * @param params - Query parameters
   * @param params.start - Start date (YYYY-MM-DD)
   * @param params.end - End date (YYYY-MM-DD)
   * @param params.types - Optional comma-separated list of types to include (e.g., 'events,due')
   * @returns Calendar data with events and due documents grouped by date
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async getCalendar(vaultId: string, params: { start: string; end: string; types?: string }): Promise<CalendarResponse> {
    try {
      const searchParams: Record<string, string> = { start: params.start, end: params.end };
      if (params.types) searchParams.types = params.types;
      return await this.http.get(`vaults/${vaultId}/calendar`, { searchParams }).json<CalendarResponse>();
    } catch (error) {
      throw await handleError(error, 'Calendar', vaultId);
    }
  }

  /**
   * Get activity summary (created/updated/deleted counts) for a vault within a date range.
   *
   * @param vaultId - Vault ID
   * @param params - Query parameters
   * @param params.start - Start date (YYYY-MM-DD)
   * @param params.end - End date (YYYY-MM-DD)
   * @returns Activity summary by date
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async getActivity(vaultId: string, params: { start: string; end: string }): Promise<CalendarActivityResponse> {
    try {
      return await this.http.get(`vaults/${vaultId}/calendar/activity`, {
        searchParams: { start: params.start, end: params.end }
      }).json<CalendarActivityResponse>();
    } catch (error) {
      throw await handleError(error, 'Calendar Activity', vaultId);
    }
  }

  /**
   * Get documents with due dates in a vault.
   *
   * @param vaultId - Vault ID
   * @param params - Optional query parameters
   * @param params.status - Filter by status: 'overdue', 'upcoming', or 'all' (default: 'all')
   * @returns Array of documents with due dates
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async getDueDates(vaultId: string, params?: { status?: 'overdue' | 'upcoming' | 'all' }): Promise<DueDocument[]> {
    try {
      const searchParams: Record<string, string> = {};
      if (params?.status) searchParams.status = params.status;
      return await this.http.get(`vaults/${vaultId}/calendar/due`, { searchParams }).json<DueDocument[]>();
    } catch (error) {
      throw await handleError(error, 'Due Dates', vaultId);
    }
  }

  /**
   * List calendar events in a vault.
   *
   * @param vaultId - Vault ID
   * @param params - Optional query parameters
   * @param params.start - Filter events starting on or after this date (YYYY-MM-DD)
   * @param params.end - Filter events starting on or before this date (YYYY-MM-DD)
   * @returns Array of calendar events
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async listEvents(vaultId: string, params?: { start?: string; end?: string }): Promise<CalendarEvent[]> {
    try {
      const searchParams: Record<string, string> = {};
      if (params?.start) searchParams.start = params.start;
      if (params?.end) searchParams.end = params.end;
      return await this.http.get(`vaults/${vaultId}/calendar/events`, { searchParams }).json<CalendarEvent[]>();
    } catch (error) {
      throw await handleError(error, 'Calendar Events', vaultId);
    }
  }

  /**
   * Create a new calendar event in a vault.
   *
   * @param vaultId - Vault ID
   * @param data - Event data
   * @returns The created event
   * @throws {ValidationError} If the event data is invalid
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async createEvent(vaultId: string, data: CreateCalendarEventInput): Promise<CalendarEvent> {
    try {
      return await this.http.post(`vaults/${vaultId}/calendar/events`, { json: data }).json<CalendarEvent>();
    } catch (error) {
      throw await handleError(error, 'Create Event', data.title);
    }
  }

  /**
   * Update an existing calendar event.
   *
   * @param vaultId - Vault ID
   * @param eventId - Event ID
   * @param data - Partial event data to update
   * @returns The updated event
   * @throws {ValidationError} If the update data is invalid
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault or event
   * @throws {NotFoundError} If the vault or event does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async updateEvent(vaultId: string, eventId: string, data: Partial<CreateCalendarEventInput>): Promise<CalendarEvent> {
    try {
      return await this.http.put(`vaults/${vaultId}/calendar/events/${eventId}`, { json: data }).json<CalendarEvent>();
    } catch (error) {
      throw await handleError(error, 'Update Event', eventId);
    }
  }

  /**
   * Delete a calendar event.
   *
   * @param vaultId - Vault ID
   * @param eventId - Event ID
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault or event
   * @throws {NotFoundError} If the vault or event does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async deleteEvent(vaultId: string, eventId: string): Promise<void> {
    try {
      await this.http.delete(`vaults/${vaultId}/calendar/events/${eventId}`);
    } catch (error) {
      throw await handleError(error, 'Delete Event', eventId);
    }
  }

  /**
   * Set or clear the due date on a document.
   *
   * @param vaultId - Vault ID
   * @param path - Document path
   * @param data - Due date data
   * @param data.dueAt - Due date/time (ISO 8601) or null to clear
   * @param data.priority - Priority level (low/medium/high) or null to clear
   * @param data.recurrence - Recurrence rule (daily/weekly/monthly/yearly) or null to clear
   * @returns The updated document metadata
   * @throws {ValidationError} If the due date data is invalid
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault or document does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async setDocumentDue(vaultId: string, path: string, data: { dueAt?: string | null; priority?: string | null; recurrence?: string | null }): Promise<unknown> {
    try {
      return await this.http.patch(`vaults/${vaultId}/documents/${path}/due`, { json: data }).json();
    } catch (error) {
      throw await handleError(error, 'Set Due Date', path);
    }
  }

  async getIcalFeed(vaultId: string, params?: { include?: string }): Promise<string> {
    try {
      const searchParams = params ? new URLSearchParams(params as Record<string, string>) : undefined;
      return await this.http.get(`vaults/${vaultId}/calendar/feed.ics`, { searchParams }).text();
    } catch (error) {
      throw await handleError(error, 'Calendar', vaultId);
    }
  }

  async getAgenda(vaultId: string, params?: { status?: string; range?: string; groupBy?: string }): Promise<AgendaResponse> {
    try {
      const searchParams = params ? new URLSearchParams(params as Record<string, string>) : undefined;
      return await this.http.get(`vaults/${vaultId}/calendar/agenda`, { searchParams }).json<AgendaResponse>();
    } catch (error) {
      throw await handleError(error, 'Calendar', vaultId);
    }
  }

  /**
   * Get timeline of upcoming events for a vault.
   *
   * @param vaultId - Vault ID
   * @param params - Optional pagination parameters
   * @param params.cursor - Pagination cursor from a previous response
   * @param params.limit - Maximum number of items to return
   * @returns Paginated timeline response
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async getTimeline(vaultId: string, params?: { cursor?: string; limit?: number }): Promise<TimelineResponse> {
    try {
      const searchParams: Record<string, string> = {};
      if (params?.cursor) searchParams.cursor = params.cursor;
      if (params?.limit !== undefined) searchParams.limit = String(params.limit);
      return await this.http.get(`vaults/${vaultId}/calendar/timeline`, { searchParams }).json<TimelineResponse>();
    } catch (error) {
      throw await handleError(error, 'Calendar Timeline', vaultId);
    }
  }

  /**
   * Get upcoming events and due items for a vault.
   *
   * @param vaultId - Vault ID
   * @returns Upcoming items summary
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async getUpcoming(vaultId: string): Promise<UpcomingResponse> {
    try {
      return await this.http.get(`vaults/${vaultId}/calendar/upcoming`).json<UpcomingResponse>();
    } catch (error) {
      throw await handleError(error, 'Calendar Upcoming', vaultId);
    }
  }

  /**
   * Generate a new iCal token for subscribing to a vault's calendar feed.
   *
   * @param vaultId - Vault ID
   * @returns The generated token and feed URL
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async generateICalToken(vaultId: string): Promise<ICalTokenResponse> {
    try {
      return await this.http.post(`vaults/${vaultId}/calendar/token`).json<ICalTokenResponse>();
    } catch (error) {
      throw await handleError(error, 'Generate iCal Token', vaultId);
    }
  }

  /**
   * Revoke the current iCal token for a vault.
   *
   * @param vaultId - Vault ID
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async revokeICalToken(vaultId: string): Promise<void> {
    try {
      await this.http.delete(`vaults/${vaultId}/calendar/token`);
    } catch (error) {
      throw await handleError(error, 'Revoke iCal Token', vaultId);
    }
  }

  /**
   * Check whether an iCal token exists for a vault.
   *
   * @param vaultId - Vault ID
   * @returns Token status
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async getICalTokenStatus(vaultId: string): Promise<ICalTokenStatus> {
    try {
      return await this.http.get(`vaults/${vaultId}/calendar/token/status`).json<ICalTokenStatus>();
    } catch (error) {
      throw await handleError(error, 'iCal Token Status', vaultId);
    }
  }

  /**
   * Toggle the completed state of a document.
   * If the document is not yet completed, sets `completedAt` to now.
   * If it is already completed, clears `completedAt`.
   *
   * @param vaultId - Vault ID
   * @param documentPath - Path of the document within the vault
   * @returns The updated document metadata
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault or document does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async toggleComplete(vaultId: string, documentPath: string): Promise<unknown> {
    try {
      return await this.http.patch(`vaults/${vaultId}/documents/${documentPath}`, {
        json: { completedAt: new Date().toISOString() },
      }).json();
    } catch (error) {
      throw await handleError(error, 'Toggle Complete', documentPath);
    }
  }

  // ---------------------------------------------------------------------------
  // Calendar connectors
  // ---------------------------------------------------------------------------

  /**
   * List calendar connectors (Google Calendar, Outlook, etc.) for a vault.
   *
   * @param vaultId - Vault ID
   * @returns Array of calendar connectors
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async listConnectors(vaultId: string): Promise<CalendarConnector[]> {
    try {
      return await this.http.get(`vaults/${vaultId}/calendar/connectors`).json<CalendarConnector[]>();
    } catch (error) {
      throw await handleError(error, 'Calendar Connectors', vaultId);
    }
  }

  /**
   * Disconnect a calendar connector from a vault.
   *
   * @param vaultId - Vault ID
   * @param connectorId - Connector ID to disconnect
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault or connector does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async disconnectConnector(vaultId: string, connectorId: string): Promise<void> {
    try {
      await this.http.delete(`vaults/${vaultId}/calendar/connectors/${connectorId}`);
    } catch (error) {
      throw await handleError(error, 'Disconnect Connector', connectorId);
    }
  }

  /**
   * Trigger a manual sync for a calendar connector.
   *
   * @param vaultId - Vault ID
   * @param connectorId - Connector ID to sync
   * @returns Sync result
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault or connector does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async syncConnector(vaultId: string, connectorId: string): Promise<CalendarConnectorSyncResult> {
    try {
      return await this.http.post(`vaults/${vaultId}/calendar/connectors/${connectorId}/sync`).json<CalendarConnectorSyncResult>();
    } catch (error) {
      throw await handleError(error, 'Sync Connector', connectorId);
    }
  }
}

// ---------------------------------------------------------------------------
// Additional interfaces for new methods
// ---------------------------------------------------------------------------

export interface TimelineItem {
  type: 'event' | 'due';
  date: string;
  event?: CalendarEvent;
  document?: DueDocument;
}

export interface TimelineResponse {
  items: TimelineItem[];
  nextCursor?: string;
  total: number;
}

export interface UpcomingResponse {
  events: CalendarEvent[];
  dueDocs: DueDocument[];
}

export interface ICalTokenResponse {
  token: string;
  feedUrl: string;
  createdAt: string;
}

export interface ICalTokenStatus {
  hasToken: boolean;
  createdAt?: string;
}

export interface CalendarConnector {
  id: string;
  userId: string;
  vaultId: string;
  provider: 'google' | 'outlook';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarConnectorSyncResult {
  synced: number;
  errors: number;
  syncedAt: string;
}
