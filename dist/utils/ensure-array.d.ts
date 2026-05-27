/**
 * Normalize a value that should be an array but might be a bare object
 * (can happen when an API returns a single-item response as an object
 * instead of a single-element array).
 */
export declare function ensureArray<T>(value: T | T[] | undefined | null): T[];
//# sourceMappingURL=ensure-array.d.ts.map