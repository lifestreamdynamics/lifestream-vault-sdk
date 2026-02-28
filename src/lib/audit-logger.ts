import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DEFAULT_LOG_DIR = path.join(os.homedir(), '.lsvault');
const DEFAULT_LOG_FILE = 'audit.log';
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROTATED_FILES = 5;

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

export class AuditLogger {
  private readonly logPath: string;
  private readonly maxSize: number;
  private readonly maxFiles: number;

  constructor(options: AuditLoggerOptions = {}) {
    this.logPath = options.logPath || path.join(DEFAULT_LOG_DIR, DEFAULT_LOG_FILE);
    this.maxSize = options.maxSize || MAX_LOG_SIZE;
    this.maxFiles = options.maxFiles || MAX_ROTATED_FILES;
  }

  getLogPath(): string {
    return this.logPath;
  }

  async log(entry: AuditEntry): Promise<void> {
    const dir = path.dirname(this.logPath);
    // mkdir with recursive:true is a no-op if the dir already exists
    await fs.promises.mkdir(dir, { recursive: true });

    await this.rotateIfNeeded();

    const line = JSON.stringify(entry) + '\n';
    await fs.promises.appendFile(this.logPath, line, 'utf-8');
  }

  private async rotateIfNeeded(): Promise<void> {
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(this.logPath);
    } catch {
      // File does not exist yet — nothing to rotate
      return;
    }

    if (stat.size < this.maxSize) return;

    // Delete oldest rotated file if it exists
    const oldest = `${this.logPath}.${this.maxFiles}`;
    try {
      await fs.promises.unlink(oldest);
    } catch {
      // Ignore — file may not exist
    }

    // Shift existing rotated files: .4 -> .5, .3 -> .4, etc.
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const src = `${this.logPath}.${i}`;
      const dest = `${this.logPath}.${i + 1}`;
      try {
        await fs.promises.rename(src, dest);
      } catch {
        // Ignore — file may not exist
      }
    }

    // Rotate current log to .1
    await fs.promises.rename(this.logPath, `${this.logPath}.1`);
  }

  readEntries(options: {
    tail?: number;
    status?: number;
    since?: string;
    until?: string;
  } = {}): AuditEntry[] {
    let content: string;
    try {
      content = fs.readFileSync(this.logPath, 'utf-8');
    } catch {
      return [];
    }
    const lines = content.split('\n').filter(Boolean);

    let entries: AuditEntry[] = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line) as AuditEntry);
      } catch {
        // Skip malformed lines
      }
    }

    if (options.status !== undefined) {
      entries = entries.filter(e => e.status === options.status);
    }
    if (options.since) {
      const sinceDate = new Date(options.since);
      entries = entries.filter(e => new Date(e.timestamp) >= sinceDate);
    }
    if (options.until) {
      const untilDate = new Date(options.until);
      entries = entries.filter(e => new Date(e.timestamp) <= untilDate);
    }
    if (options.tail !== undefined) {
      entries = entries.slice(-options.tail);
    }

    return entries;
  }

  exportCsv(entries: AuditEntry[]): string {
    const header = 'timestamp,method,path,status,durationMs';
    const rows = entries.map(e =>
      `${csvEscape(e.timestamp)},${csvEscape(e.method)},${csvEscape(e.path)},${e.status},${e.durationMs}`
    );
    return [header, ...rows].join('\n') + '\n';
  }
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
