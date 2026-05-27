/**
 * Lightweight typed event emitter for SDK lifecycle events.
 *
 * Browser-compatible — does not rely on Node.js `events` module.
 *
 * @example
 * ```typescript
 * const emitter = new SDKEventEmitter();
 * emitter.on('afterResponse', ({ url, status, durationMs }) => {
 *   console.log(`${url} → ${status} (${durationMs}ms)`);
 * });
 * const client = new LifestreamVaultClient({ apiKey: '...', events: emitter });
 * ```
 */
export class SDKEventEmitter {
    listeners = new Map();
    /**
     * Registers a listener for the given event type.
     * Adding the same listener reference twice is a no-op (Set deduplication).
     */
    on(event, listener) {
        if (!this.listeners.has(event))
            this.listeners.set(event, new Set());
        this.listeners.get(event).add(listener);
    }
    /**
     * Removes a previously registered listener.
     * Safe to call even if the listener was never registered.
     */
    off(event, listener) {
        this.listeners.get(event)?.delete(listener);
    }
    /**
     * Emits an event, calling all registered listeners synchronously.
     * Listeners are called in insertion order.
     */
    emit(event, data) {
        this.listeners.get(event)?.forEach((fn) => fn(data));
    }
}
//# sourceMappingURL=event-emitter.js.map