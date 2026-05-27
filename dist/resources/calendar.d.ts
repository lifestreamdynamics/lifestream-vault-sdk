import type { KyInstance } from 'ky';
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
export interface CalendarEventTemplate {
    id: string;
    vaultId: string;
    userId: string;
    name: string;
    description?: string;
    duration: number;
    location?: string;
    color?: string;
    defaultPriority?: string;
    recurrenceRule?: RecurrenceRule;
    metadata?: unknown;
    createdAt: string;
    updatedAt: string;
}
export interface CreateEventTemplateInput {
    name: string;
    description?: string;
    duration: number;
    location?: string;
    color?: string;
    defaultPriority?: string;
    recurrenceRule?: RecurrenceRule;
    metadata?: unknown;
}
export interface UpdateEventTemplateInput {
    name?: string;
    description?: string;
    duration?: number;
    location?: string;
    color?: string;
    defaultPriority?: string;
    recurrenceRule?: RecurrenceRule;
    metadata?: unknown;
}
/** Response returned when setting or clearing a document due date or completion state. */
export interface DocumentDueResponse {
    id: string;
    path: string;
    dueAt?: string | null;
    completedAt?: string | null;
    priority?: string | null;
}
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
export interface CalendarConnectorOAuthResult {
    authUrl: string;
}
export interface EventParticipant {
    id: string;
    calendarEventId: string;
    userId?: string;
    email: string;
    name?: string;
    status: 'invited' | 'accepted' | 'declined' | 'tentative';
    role: 'organizer' | 'attendee' | 'optional';
    respondedAt?: string;
    createdAt: string;
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
export declare class CalendarResource {
    private http;
    constructor(http: KyInstance);
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
    getCalendar(vaultId: string, params: {
        start: string;
        end: string;
        types?: string;
    }): Promise<CalendarResponse>;
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
    getActivity(vaultId: string, params: {
        start: string;
        end: string;
    }): Promise<CalendarActivityResponse>;
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
    getDueDates(vaultId: string, params?: {
        status?: 'overdue' | 'upcoming' | 'all';
    }): Promise<DueDocument[]>;
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
    listEvents(vaultId: string, params?: {
        start?: string;
        end?: string;
    }): Promise<CalendarEvent[]>;
    /**
     * Get a single calendar event by ID.
     *
     * @param vaultId - Vault ID
     * @param eventId - Event ID
     * @returns The calendar event
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user does not have access to the vault or event
     * @throws {NotFoundError} If the vault or event does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    getEvent(vaultId: string, eventId: string): Promise<CalendarEvent>;
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
    createEvent(vaultId: string, data: CreateCalendarEventInput): Promise<CalendarEvent>;
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
    updateEvent(vaultId: string, eventId: string, data: Partial<CreateCalendarEventInput>): Promise<CalendarEvent>;
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
    deleteEvent(vaultId: string, eventId: string): Promise<void>;
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
    setDocumentDue(vaultId: string, path: string, data: {
        dueAt?: string | null;
        priority?: string | null;
        recurrence?: string | null;
    }): Promise<DocumentDueResponse>;
    getIcalFeed(vaultId: string, params?: {
        include?: string;
    }): Promise<string>;
    getAgenda(vaultId: string, params?: {
        status?: string;
        range?: string;
        groupBy?: string;
    }): Promise<AgendaResponse>;
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
    getTimeline(vaultId: string, params?: {
        cursor?: string;
        limit?: number;
    }): Promise<TimelineResponse>;
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
    getUpcoming(vaultId: string): Promise<UpcomingResponse>;
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
    generateICalToken(vaultId: string): Promise<ICalTokenResponse>;
    /**
     * Revoke the current iCal token for a vault.
     *
     * @param vaultId - Vault ID
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user does not have access to the vault
     * @throws {NotFoundError} If the vault does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    revokeICalToken(vaultId: string): Promise<void>;
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
    getICalTokenStatus(vaultId: string): Promise<ICalTokenStatus>;
    /**
     * Set the completed state of a document.
     * When `completed` is true, sets `completedAt` to the current time.
     * When `completed` is false, clears `completedAt`.
     *
     * @param vaultId - Vault ID
     * @param documentPath - Path of the document within the vault
     * @param completed - Whether to mark the document as completed (`true`) or incomplete (`false`)
     * @returns The updated document metadata
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user does not have access to the vault
     * @throws {NotFoundError} If the vault or document does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    toggleComplete(vaultId: string, documentPath: string, completed: boolean): Promise<DocumentDueResponse>;
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
    listConnectors(vaultId: string): Promise<CalendarConnector[]>;
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
    disconnectConnector(vaultId: string, connectorId: string): Promise<void>;
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
    syncConnector(vaultId: string, connectorId: string): Promise<CalendarConnectorSyncResult>;
    connectGoogleCalendar(vaultId: string): Promise<CalendarConnectorOAuthResult>;
    connectOutlookCalendar(vaultId: string): Promise<CalendarConnectorOAuthResult>;
    /**
     * List participants for a calendar event.
     *
     * @param vaultId - Vault ID
     * @param eventId - Calendar event ID
     * @returns Array of event participants
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user does not have access or insufficient subscription tier
     * @throws {NotFoundError} If the vault or event does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    listParticipants(vaultId: string, eventId: string): Promise<EventParticipant[]>;
    /**
     * Add a participant to a calendar event.
     *
     * @param vaultId - Vault ID
     * @param eventId - Calendar event ID
     * @param data - Participant data
     * @param data.email - Participant email address
     * @param data.name - Optional participant display name
     * @param data.role - Participant role: 'organizer', 'attendee', or 'optional' (default: 'attendee')
     * @returns The created participant record
     * @throws {ValidationError} If the participant data is invalid
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user does not have access or insufficient subscription tier
     * @throws {NotFoundError} If the vault or event does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    addParticipant(vaultId: string, eventId: string, data: {
        email: string;
        name?: string;
        role?: string;
    }): Promise<EventParticipant>;
    /**
     * Update a participant's status for a calendar event.
     *
     * @param vaultId - Vault ID
     * @param eventId - Calendar event ID
     * @param participantId - Participant ID
     * @param data - Update data (status)
     * @returns The updated participant record
     * @throws {ValidationError} If the status is invalid
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user does not have access or insufficient subscription tier
     * @throws {NotFoundError} If the vault, event, or participant does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    updateParticipant(vaultId: string, eventId: string, participantId: string, data: {
        status: string;
    }): Promise<EventParticipant>;
    /**
     * Remove a participant from a calendar event.
     *
     * @param vaultId - Vault ID
     * @param eventId - Calendar event ID
     * @param participantId - Participant ID
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user does not have access or insufficient subscription tier
     * @throws {NotFoundError} If the vault, event, or participant does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    removeParticipant(vaultId: string, eventId: string, participantId: string): Promise<void>;
    listTemplates(vaultId: string): Promise<CalendarEventTemplate[]>;
    createTemplate(vaultId: string, data: CreateEventTemplateInput): Promise<CalendarEventTemplate>;
    getTemplate(vaultId: string, templateId: string): Promise<CalendarEventTemplate>;
    updateTemplate(vaultId: string, templateId: string, data: UpdateEventTemplateInput): Promise<CalendarEventTemplate>;
    deleteTemplate(vaultId: string, templateId: string): Promise<void>;
}
//# sourceMappingURL=calendar.d.ts.map