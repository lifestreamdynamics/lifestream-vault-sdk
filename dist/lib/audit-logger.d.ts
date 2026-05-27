export interface AuditEntry {
    timestamp: string;
    method: string;
    path: string;
    status: number;
    durationMs: number;
}
export interface AuditLoggerOptions {
    logPath?: string;
    maxSize?: number;
    maxFiles?: number;
}
export declare class AuditLogger {
    private readonly logPath;
    private readonly maxSize;
    private readonly maxFiles;
    constructor(options?: AuditLoggerOptions);
    getLogPath(): string;
    log(entry: AuditEntry): Promise<void>;
    private rotateIfNeeded;
    readEntries(options?: {
        tail?: number;
        status?: number;
        since?: string;
        until?: string;
    }): AuditEntry[];
    exportCsv(entries: AuditEntry[]): string;
}
//# sourceMappingURL=audit-logger.d.ts.map