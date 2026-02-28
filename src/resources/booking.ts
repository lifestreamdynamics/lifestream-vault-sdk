import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export type WaitlistStatus = 'waiting' | 'notified' | 'expired' | 'left';

export interface BookingWaitlistEntry {
  id: string;
  slotId: string;
  vaultId: string;
  startAt: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  position: number;
  status: WaitlistStatus;
  notifiedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface JoinWaitlistInput {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  startAt: string;
}

export interface WaitlistFilters {
  startAt?: string;
  status?: WaitlistStatus;
}

export interface EventSlot {
  id: string;
  vaultId: string;
  userId: string;
  title: string;
  description?: string;
  durationMin: number;
  bufferMin: number;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  daysOfWeek: string[];
  timezone: string;
  isActive: boolean;
  maxConcurrent: number;
  confirmationMode: 'auto' | 'email' | 'manual';
  createBackingFile: boolean;
  requirePhone: boolean;
  /** Price in smallest currency unit (cents). Null means the slot is free. */
  priceCents?: number | null;
  /** ISO 4217 currency code, e.g. 'CAD'. */
  currency: string;
  /** When true, an invoice will be created and sent to the guest after booking. */
  requirePayment: boolean;
  customFields?: unknown;
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'unpaid' | 'invoiced' | 'paid' | 'refunded' | 'partial';

export interface Booking {
  id: string;
  slotId: string;
  calendarEventId?: string;
  vaultId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'completed';
  startAt: string;
  endAt: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestNotes?: string;
  metadata?: unknown;
  confirmedAt?: string;
  cancelledAt?: string;
  /** External invoice ID from the accounting system. */
  invoiceId?: string | null;
  /** Payment status for this booking. */
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableTime {
  startAt: string;
  endAt: string;
}

/** Branding configuration returned alongside public booking slot listings. */
export interface BookingBranding {
  bookingLogoUrl: string | null;
  bookingAccentColor: string | null;
  bookingWelcomeMessage: string | null;
  hidePoweredBy: boolean;
}

export interface AvailabilityResponse {
  times: AvailableTime[];
}

export interface CreateSlotInput {
  title: string;
  description?: string;
  durationMin: number;
  bufferMin?: number;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  timezone: string;
  maxConcurrent?: number;
  confirmationMode?: 'auto' | 'email' | 'manual';
  createBackingFile?: boolean;
  requirePhone?: boolean;
  priceCents?: number;
  currency?: string;
  requirePayment?: boolean;
  customFields?: unknown;
  metadata?: unknown;
}

export interface UpdateSlotInput extends Partial<CreateSlotInput> {
  isActive?: boolean;
}

export interface BookingFilters {
  status?: Booking['status'];
  slotId?: string;
  startAfter?: string;
  startBefore?: string;
}

export interface BookingAnalytics {
  view: string;
  data: Array<Record<string, unknown>>;
}

export interface AnalyticsFilters {
  view?: 'volume' | 'funnel' | 'peak-times';
  from?: string;
  to?: string;
  slotId?: string;
}

export interface EventTemplate {
  id: string;
  vaultId: string;
  userId: string;
  name: string;
  description?: string;
  defaults: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  defaults: Record<string, unknown>;
}

/**
 * Resource for booking slots and guest booking management.
 *
 * Provides methods to manage event slots (bookable time windows) and
 * their associated bookings (guest reservations) within a vault.
 *
 * @example
 * ```typescript
 * // List all booking slots for a vault
 * const slots = await client.booking.listSlots('vault-id');
 *
 * // Check availability for a specific slot
 * const availability = await client.booking.getAvailability(
 *   'vault-id',
 *   'slot-id',
 *   '2026-03-15',
 * );
 * ```
 */
export class BookingResource {
  constructor(private http: KyInstance) {}

  // ---------------------------------------------------------------------------
  // Slot management
  // ---------------------------------------------------------------------------

  /**
   * List all event slots for a vault.
   *
   * @param vaultId - Vault ID
   * @returns Array of event slots
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async listSlots(vaultId: string): Promise<EventSlot[]> {
    try {
      const data = await this.http.get(`vaults/${vaultId}/calendar/slots`).json<{ slots: EventSlot[] }>();
      return data.slots;
    } catch (error) {
      throw await handleError(error, 'Event Slots', vaultId);
    }
  }

  /**
   * Create a new bookable event slot.
   *
   * @param vaultId - Vault ID
   * @param data - Slot configuration
   * @returns The created slot
   * @throws {ValidationError} If the slot data is invalid
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async createSlot(vaultId: string, data: CreateSlotInput): Promise<EventSlot> {
    try {
      return await this.http.post(`vaults/${vaultId}/calendar/slots`, { json: data }).json<EventSlot>();
    } catch (error) {
      throw await handleError(error, 'Create Slot', data.title);
    }
  }

  /**
   * Update an existing event slot.
   *
   * @param vaultId - Vault ID
   * @param slotId - Slot ID
   * @param data - Partial slot data to update
   * @returns The updated slot
   * @throws {ValidationError} If the update data is invalid
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault or slot
   * @throws {NotFoundError} If the vault or slot does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async updateSlot(vaultId: string, slotId: string, data: UpdateSlotInput): Promise<EventSlot> {
    try {
      return await this.http.put(`vaults/${vaultId}/calendar/slots/${slotId}`, { json: data }).json<EventSlot>();
    } catch (error) {
      throw await handleError(error, 'Update Slot', slotId);
    }
  }

  /**
   * Delete an event slot.
   *
   * @param vaultId - Vault ID
   * @param slotId - Slot ID
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault or slot
   * @throws {NotFoundError} If the vault or slot does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async deleteSlot(vaultId: string, slotId: string): Promise<void> {
    try {
      await this.http.delete(`vaults/${vaultId}/calendar/slots/${slotId}`);
    } catch (error) {
      throw await handleError(error, 'Delete Slot', slotId);
    }
  }

  /**
   * Get available time windows for a slot on a given date.
   *
   * @param vaultId - Vault ID
   * @param slotId - Slot ID
   * @param date - Date to check availability for (YYYY-MM-DD)
   * @returns Availability information including open time windows
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault or slot does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async getAvailability(vaultId: string, slotId: string, date: string): Promise<AvailabilityResponse> {
    try {
      return await this.http
        .get(`vaults/${vaultId}/calendar/slots/${slotId}/availability`, { searchParams: { date } })
        .json<AvailabilityResponse>();
    } catch (error) {
      throw await handleError(error, 'Slot Availability', slotId);
    }
  }

  // ---------------------------------------------------------------------------
  // Booking management
  // ---------------------------------------------------------------------------

  /**
   * List bookings for a vault, with optional filters.
   *
   * @param vaultId - Vault ID
   * @param filters - Optional filter parameters
   * @param filters.status - Filter by booking status
   * @param filters.slotId - Filter by slot ID
   * @param filters.startAfter - Filter bookings starting on or after this date (YYYY-MM-DD)
   * @param filters.startBefore - Filter bookings starting on or before this date (YYYY-MM-DD)
   * @returns Array of bookings
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async listBookings(vaultId: string, filters?: BookingFilters): Promise<{ bookings: Booking[], total: number }> {
    try {
      const searchParams: Record<string, string> = {};
      if (filters?.status) searchParams.status = filters.status;
      if (filters?.slotId) searchParams.slotId = filters.slotId;
      if (filters?.startAfter) searchParams.startAfter = filters.startAfter;
      if (filters?.startBefore) searchParams.startBefore = filters.startBefore;
      return await this.http.get(`vaults/${vaultId}/calendar/bookings`, { searchParams }).json<{ bookings: Booking[], total: number }>();
    } catch (error) {
      throw await handleError(error, 'Bookings', vaultId);
    }
  }

  /**
   * Get a single booking by ID.
   *
   * @param vaultId - Vault ID
   * @param bookingId - Booking ID
   * @returns The booking record
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault or booking
   * @throws {NotFoundError} If the vault or booking does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async getBooking(vaultId: string, bookingId: string): Promise<Booking> {
    try {
      return await this.http.get(`vaults/${vaultId}/calendar/bookings/${bookingId}`).json<Booking>();
    } catch (error) {
      throw await handleError(error, 'Booking', bookingId);
    }
  }

  /**
   * Update the status of a booking (confirm, cancel, mark no-show, etc.).
   *
   * @param vaultId - Vault ID
   * @param bookingId - Booking ID
   * @param status - New status for the booking
   * @returns The updated booking
   * @throws {ValidationError} If the status transition is not allowed
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault or booking
   * @throws {NotFoundError} If the vault or booking does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async updateBookingStatus(vaultId: string, bookingId: string, status: Booking['status']): Promise<Booking> {
    try {
      return await this.http
        .patch(`vaults/${vaultId}/calendar/bookings/${bookingId}/status`, { json: { status } })
        .json<Booking>();
    } catch (error) {
      throw await handleError(error, 'Update Booking Status', bookingId);
    }
  }

  // ---------------------------------------------------------------------------
  // Event template management
  // ---------------------------------------------------------------------------

  /**
   * List all event templates for a vault.
   *
   * @param vaultId - Vault ID
   * @returns Array of event templates
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async listTemplates(vaultId: string): Promise<EventTemplate[]> {
    try {
      const data = await this.http
        .get(`vaults/${vaultId}/calendar/templates`)
        .json<{ templates: EventTemplate[] }>();
      return data.templates;
    } catch (error) {
      throw await handleError(error, 'Templates', vaultId);
    }
  }

  /**
   * Create a new event template.
   *
   * @param vaultId - Vault ID
   * @param data - Template configuration
   * @returns The created template
   * @throws {ValidationError} If the template data is invalid
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async createTemplate(vaultId: string, data: CreateTemplateInput): Promise<EventTemplate> {
    try {
      return await this.http
        .post(`vaults/${vaultId}/calendar/templates`, { json: data })
        .json<EventTemplate>();
    } catch (error) {
      throw await handleError(error, 'Create Template', data.name);
    }
  }

  /**
   * Update an existing event template.
   *
   * @param vaultId - Vault ID
   * @param templateId - Template ID
   * @param data - Partial template data to update
   * @returns The updated template
   * @throws {ValidationError} If the update data is invalid
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault or template
   * @throws {NotFoundError} If the vault or template does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async updateTemplate(
    vaultId: string,
    templateId: string,
    data: Partial<CreateTemplateInput>,
  ): Promise<EventTemplate> {
    try {
      return await this.http
        .put(`vaults/${vaultId}/calendar/templates/${templateId}`, { json: data })
        .json<EventTemplate>();
    } catch (error) {
      throw await handleError(error, 'Update Template', templateId);
    }
  }

  /**
   * Delete an event template.
   *
   * @param vaultId - Vault ID
   * @param templateId - Template ID
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault or template
   * @throws {NotFoundError} If the vault or template does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async deleteTemplate(vaultId: string, templateId: string): Promise<void> {
    try {
      await this.http.delete(`vaults/${vaultId}/calendar/templates/${templateId}`);
    } catch (error) {
      throw await handleError(error, 'Delete Template', templateId);
    }
  }

  // ---------------------------------------------------------------------------
  // Waitlist management (Business tier)
  // ---------------------------------------------------------------------------

  /**
   * Get the waitlist for a booking slot.
   *
   * @param vaultId - Vault ID
   * @param slotId - Event slot ID
   * @param params - Optional filters (startAt, status)
   * @returns Waitlist entries and total count
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access to the vault
   * @throws {NotFoundError} If the vault or slot does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async getWaitlist(
    vaultId: string,
    slotId: string,
    params?: WaitlistFilters,
  ): Promise<{ entries: BookingWaitlistEntry[]; total: number }> {
    try {
      const searchParams: Record<string, string> = {};
      if (params?.startAt) searchParams.startAt = params.startAt;
      if (params?.status) searchParams.status = params.status;
      return await this.http
        .get(`vaults/${vaultId}/calendar/slots/${slotId}/waitlist`, { searchParams })
        .json<{ entries: BookingWaitlistEntry[]; total: number }>();
    } catch (error) {
      throw await handleError(error, 'Waitlist', slotId);
    }
  }

  /**
   * Join the waitlist for a public booking slot (no auth required).
   *
   * @param profileSlug - Host profile slug
   * @param vaultSlug - Vault slug
   * @param slotId - Event slot ID
   * @param data - Guest details and desired start time
   * @returns Position in waitlist and leave token
   * @throws {NotFoundError} If the published vault or slot does not exist
   * @throws {ValidationError} If the guest details are invalid
   * @throws {NetworkError} If the request fails due to network issues
   */
  async joinWaitlist(
    profileSlug: string,
    vaultSlug: string,
    slotId: string,
    data: JoinWaitlistInput,
  ): Promise<{ message: string; position: number; leaveToken: string }> {
    try {
      return await this.http
        .post(`public/vaults/${profileSlug}/${vaultSlug}/booking-slots/${slotId}/waitlist`, { json: data })
        .json<{ message: string; position: number; leaveToken: string }>();
    } catch (error) {
      throw await handleError(error, 'Join Waitlist', slotId);
    }
  }

  /**
   * Leave the waitlist using a leave token (GDPR right to withdraw).
   *
   * @param leaveToken - The 64-char hex leave token from the join response
   * @returns Confirmation message
   * @throws {NotFoundError} If the leave token is invalid
   * @throws {ValidationError} If the entry is already expired or left
   * @throws {NetworkError} If the request fails due to network issues
   */
  async leaveWaitlist(leaveToken: string): Promise<{ message: string }> {
    try {
      return await this.http
        .delete(`public/bookings/waitlist/${leaveToken}`)
        .json<{ message: string }>();
    } catch (error) {
      throw await handleError(error, 'Leave Waitlist', leaveToken);
    }
  }

  // ---------------------------------------------------------------------------
  // Guest self-service reschedule
  // ---------------------------------------------------------------------------

  /**
   * Reschedule a booking using a guest reschedule token.
   *
   * Cancels the existing booking and creates a new one at the specified time.
   * The reschedule token is included in the guest's original confirmation email
   * link at `/reschedule/:token`.
   *
   * @param token - The reschedule token from the guest's email link (64-char hex)
   * @param newStartAt - The new start time in ISO 8601 format
   * @returns Confirmation of the rescheduled booking
   * @throws {NotFoundError} If the token is invalid or booking is not found
   * @throws {ValidationError} If the new time is invalid or outside the notice window
   * @throws {ConflictError} If the new time slot is no longer available
   * @throws {NetworkError} If the request fails due to network issues
   */
  async rescheduleBooking(
    token: string,
    newStartAt: string,
  ): Promise<{ message: string; guestName: string; startAt: string }> {
    try {
      return await this.http
        .post(`public/bookings/reschedule/${token}`, { json: { newStartAt } })
        .json<{ message: string; guestName: string; startAt: string }>();
    } catch (error) {
      throw await handleError(error, 'Reschedule Booking', token);
    }
  }

  // ---------------------------------------------------------------------------
  // Booking analytics (Business tier)
  // ---------------------------------------------------------------------------

  /**
   * Get booking analytics for a vault.
   *
   * @param vaultId - Vault ID
   * @param filters - Optional analytics filters
   * @param filters.view - Analytics view type: 'volume', 'funnel', or 'peak-times' (default: 'volume')
   * @param filters.from - Start date (YYYY-MM-DD, default: 30 days ago)
   * @param filters.to - End date (YYYY-MM-DD, default: today)
   * @param filters.slotId - Filter by event slot ID
   * @returns Booking analytics data
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user does not have access or insufficient subscription tier
   * @throws {NotFoundError} If the vault does not exist
   * @throws {NetworkError} If the request fails due to network issues
   */
  async getBookingAnalytics(vaultId: string, filters?: AnalyticsFilters): Promise<BookingAnalytics> {
    try {
      const searchParams: Record<string, string> = {};
      if (filters?.view) searchParams.view = filters.view;
      if (filters?.from) searchParams.from = filters.from;
      if (filters?.to) searchParams.to = filters.to;
      if (filters?.slotId) searchParams.slotId = filters.slotId;
      return await this.http
        .get(`vaults/${vaultId}/calendar/analytics`, { searchParams })
        .json<BookingAnalytics>();
    } catch (error) {
      throw await handleError(error, 'Booking Analytics', vaultId);
    }
  }
}
