import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

export interface CalendarEvent {
  id: string;
  vaultId: string;
  userId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  recurrence?: string;
  completed: boolean;
  priority?: string;
  color?: string;
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
  recurrence?: string;
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
}
