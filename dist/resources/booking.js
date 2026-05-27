import { handleError } from '../handle-error.js';
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
    http;
    constructor(http) {
        this.http = http;
    }
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
    async listSlots(vaultId) {
        try {
            const data = await this.http.get(`vaults/${vaultId}/calendar/slots`).json();
            return data.slots;
        }
        catch (error) {
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
    async createSlot(vaultId, data) {
        try {
            return await this.http.post(`vaults/${vaultId}/calendar/slots`, { json: data }).json();
        }
        catch (error) {
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
    async updateSlot(vaultId, slotId, data) {
        try {
            return await this.http.put(`vaults/${vaultId}/calendar/slots/${slotId}`, { json: data }).json();
        }
        catch (error) {
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
    async deleteSlot(vaultId, slotId) {
        try {
            await this.http.delete(`vaults/${vaultId}/calendar/slots/${slotId}`);
        }
        catch (error) {
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
    async getAvailability(vaultId, slotId, date) {
        try {
            return await this.http
                .get(`vaults/${vaultId}/calendar/slots/${slotId}/availability`, { searchParams: { date } })
                .json();
        }
        catch (error) {
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
    async listBookings(vaultId, filters) {
        try {
            const searchParams = {};
            if (filters?.status)
                searchParams.status = filters.status;
            if (filters?.slotId)
                searchParams.slotId = filters.slotId;
            if (filters?.startAfter)
                searchParams.startAfter = filters.startAfter;
            if (filters?.startBefore)
                searchParams.startBefore = filters.startBefore;
            return await this.http.get(`vaults/${vaultId}/calendar/bookings`, { searchParams }).json();
        }
        catch (error) {
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
    async getBooking(vaultId, bookingId) {
        try {
            return await this.http.get(`vaults/${vaultId}/calendar/bookings/${bookingId}`).json();
        }
        catch (error) {
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
    async updateBookingStatus(vaultId, bookingId, status) {
        try {
            return await this.http
                .patch(`vaults/${vaultId}/calendar/bookings/${bookingId}/status`, { json: { status } })
                .json();
        }
        catch (error) {
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
    async listTemplates(vaultId) {
        try {
            const data = await this.http
                .get(`vaults/${vaultId}/calendar/templates`)
                .json();
            return data.templates;
        }
        catch (error) {
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
    async createTemplate(vaultId, data) {
        try {
            return await this.http
                .post(`vaults/${vaultId}/calendar/templates`, { json: data })
                .json();
        }
        catch (error) {
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
    async updateTemplate(vaultId, templateId, data) {
        try {
            return await this.http
                .put(`vaults/${vaultId}/calendar/templates/${templateId}`, { json: data })
                .json();
        }
        catch (error) {
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
    async deleteTemplate(vaultId, templateId) {
        try {
            await this.http.delete(`vaults/${vaultId}/calendar/templates/${templateId}`);
        }
        catch (error) {
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
    async getWaitlist(vaultId, slotId, params) {
        try {
            const searchParams = {};
            if (params?.startAt)
                searchParams.startAt = params.startAt;
            if (params?.status)
                searchParams.status = params.status;
            return await this.http
                .get(`vaults/${vaultId}/calendar/slots/${slotId}/waitlist`, { searchParams })
                .json();
        }
        catch (error) {
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
    async joinWaitlist(profileSlug, vaultSlug, slotId, data) {
        try {
            return await this.http
                .post(`public/vaults/${profileSlug}/${vaultSlug}/booking-slots/${slotId}/waitlist`, { json: data })
                .json();
        }
        catch (error) {
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
    async leaveWaitlist(leaveToken) {
        try {
            return await this.http
                .delete(`public/bookings/waitlist/${leaveToken}`)
                .json();
        }
        catch (error) {
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
    async rescheduleBooking(token, newStartAt) {
        try {
            return await this.http
                .post(`public/bookings/reschedule/${token}`, { json: { newStartAt } })
                .json();
        }
        catch (error) {
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
    async getBookingAnalytics(vaultId, filters) {
        try {
            const searchParams = {};
            if (filters?.view)
                searchParams.view = filters.view;
            if (filters?.from)
                searchParams.from = filters.from;
            if (filters?.to)
                searchParams.to = filters.to;
            if (filters?.slotId)
                searchParams.slotId = filters.slotId;
            return await this.http
                .get(`vaults/${vaultId}/calendar/analytics`, { searchParams })
                .json();
        }
        catch (error) {
            throw await handleError(error, 'Booking Analytics', vaultId);
        }
    }
}
//# sourceMappingURL=booking.js.map