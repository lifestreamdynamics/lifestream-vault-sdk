/**
 * Convert a caught error into the appropriate typed SDK error.
 * @param error  The caught error (typically from ky)
 * @param resource  Human-readable resource name for 404 messages
 * @param identifier  Resource identifier for 404 messages
 */
export declare function handleError(error: unknown, resource?: string, identifier?: string): Promise<never>;
//# sourceMappingURL=handle-error.d.ts.map