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
/**
 * Emitted when ky is about to retry a request after a retryable failure.
 * Fired from the `beforeRetry` ky hook, so it fires before the retry attempt
 * is sent, not after the failed attempt is received.
 */
export interface RetryEvent {
    /** Request URL. */
    url: string;
    /** HTTP method (upper-cased). */
    method: string;
    /** 1-based retry attempt number (1 = first retry). */
    retryCount: number;
    /**
     * HTTP status code of the response that triggered the retry, if any.
     * Undefined for network-level errors (no response received).
     */
    status: number | undefined;
    /** The error that triggered the retry. */
    error: Error;
}
export type SDKEventMap = {
    beforeRequest: BeforeRequestEvent;
    afterResponse: AfterResponseEvent;
    error: RequestErrorEvent;
    tokenRefresh: TokenRefreshEvent;
    /** Fired before each retry attempt. Subscribe to observe back-off/throttle handling. */
    retry: RetryEvent;
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