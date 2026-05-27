/** Events emitted by the SDK during request lifecycle. */
export interface BeforeRequestEvent {
    url: string;
    method: string;
}
export interface AfterResponseEvent {
    url: string;
    method: string;
    status: number;
    durationMs: number;
}
export interface RequestErrorEvent {
    url: string;
    method: string;
    error: Error;
}
export interface TokenRefreshEvent {
    success: boolean;
}
export type SDKEventMap = {
    beforeRequest: BeforeRequestEvent;
    afterResponse: AfterResponseEvent;
    error: RequestErrorEvent;
    tokenRefresh: TokenRefreshEvent;
};
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
export declare class SDKEventEmitter {
    private listeners;
    /**
     * Registers a listener for the given event type.
     * Adding the same listener reference twice is a no-op (Set deduplication).
     */
    on<K extends keyof SDKEventMap>(event: K, listener: (data: SDKEventMap[K]) => void): void;
    /**
     * Removes a previously registered listener.
     * Safe to call even if the listener was never registered.
     */
    off<K extends keyof SDKEventMap>(event: K, listener: (data: SDKEventMap[K]) => void): void;
    /**
     * Emits an event, calling all registered listeners synchronously.
     * Listeners are called in insertion order.
     */
    emit<K extends keyof SDKEventMap>(event: K, data: SDKEventMap[K]): void;
}
//# sourceMappingURL=event-emitter.d.ts.map