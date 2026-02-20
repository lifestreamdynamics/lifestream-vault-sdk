import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

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
  customFields?: unknown;
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
}

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
  createdAt: string;
  updatedAt: string;
}

export interface AvailableTime {
  startAt: string;
  endAt: string;
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
      return await this.http.get(`vaults/${vaultId}/calendar/slots`).json<EventSlot[]>();
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
  async listBookings(vaultId: string, filters?: BookingFilters): Promise<Booking[]> {
    try {
      const searchParams: Record<string, string> = {};
      if (filters?.status) searchParams.status = filters.status;
      if (filters?.slotId) searchParams.slotId = filters.slotId;
      if (filters?.startAfter) searchParams.startAfter = filters.startAfter;
      if (filters?.startBefore) searchParams.startBefore = filters.startBefore;
      return await this.http.get(`vaults/${vaultId}/calendar/bookings`, { searchParams }).json<Booking[]>();
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
}
