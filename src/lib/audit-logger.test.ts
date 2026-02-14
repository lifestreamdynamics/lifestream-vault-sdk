import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AuditLogger, type AuditEntry } from './audit-logger.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
}

function sampleEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    timestamp: '2026-02-13T12:00:00.000Z',
    method: 'GET',
    path: '/api/v1/vaults',
    status: 200,
    durationMs: 45,
    ...overrides,
  };
}

describe('AuditLogger', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should use default log path when none provided', () => {
      const logger = new AuditLogger();
      expect(logger.getLogPath()).toBe(path.join(os.homedir(), '.lsvault', 'audit.log'));
    });

    it('should use custom log path when provided', () => {
      const customPath = path.join(tmpDir, 'custom.log');
      const logger = new AuditLogger({ logPath: customPath });
      expect(logger.getLogPath()).toBe(customPath);
    });
  });

  describe('log', () => {
    it('should create the log file and write a JSONL entry', () => {
      const logPath = path.join(tmpDir, 'audit.log');
      const logger = new AuditLogger({ logPath });

      const entry = sampleEntry();
      logger.log(entry);

      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0])).toEqual(entry);
    });

    it('should append multiple entries', () => {
      const logPath = path.join(tmpDir, 'audit.log');
      const logger = new AuditLogger({ logPath });

      logger.log(sampleEntry({ method: 'GET' }));
      logger.log(sampleEntry({ method: 'POST' }));
      logger.log(sampleEntry({ method: 'DELETE' }));

      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(3);
      expect(JSON.parse(lines[0]).method).toBe('GET');
      expect(JSON.parse(lines[1]).method).toBe('POST');
      expect(JSON.parse(lines[2]).method).toBe('DELETE');
    });

    it('should create parent directories if they do not exist', () => {
      const logPath = path.join(tmpDir, 'nested', 'deep', 'audit.log');
      const logger = new AuditLogger({ logPath });

      logger.log(sampleEntry());

      expect(fs.existsSync(logPath)).toBe(true);
    });

    it('should not log Authorization headers, bodies, or query parameters', () => {
      const logPath = path.join(tmpDir, 'audit.log');
      const logger = new AuditLogger({ logPath });

      const entry = sampleEntry({ path: '/api/v1/vaults' });
      logger.log(entry);

      const content = fs.readFileSync(logPath, 'utf-8');
      const parsed = JSON.parse(content.trim());
      const keys = Object.keys(parsed);
      expect(keys).toEqual(['timestamp', 'method', 'path', 'status', 'durationMs']);
      expect(content).not.toContain('Authorization');
      expect(content).not.toContain('Bearer');
    });
  });

  describe('log rotation', () => {
    it('should rotate when file exceeds max size', () => {
      const logPath = path.join(tmpDir, 'audit.log');
      const logger = new AuditLogger({ logPath, maxSize: 100, maxFiles: 3 });

      // Write enough data to exceed 100 bytes
      const entry = sampleEntry({ path: '/api/v1/vaults/some-long-path-to-exceed-size' });
      logger.log(entry); // First entry fills the file
      logger.log(entry); // Should trigger rotation

      // Original file should exist (new data after rotation)
      expect(fs.existsSync(logPath)).toBe(true);
      // Rotated file should exist
      expect(fs.existsSync(`${logPath}.1`)).toBe(true);
    });

    it('should keep only maxFiles rotated files', () => {
      const logPath = path.join(tmpDir, 'audit.log');
      const logger = new AuditLogger({ logPath, maxSize: 50, maxFiles: 2 });

      // Write enough entries to trigger multiple rotations
      for (let i = 0; i < 10; i++) {
        logger.log(sampleEntry({ durationMs: i }));
      }

      // Should not have more than maxFiles rotated files
      expect(fs.existsSync(`${logPath}.1`)).toBe(true);
      expect(fs.existsSync(`${logPath}.2`)).toBe(true);
      expect(fs.existsSync(`${logPath}.3`)).toBe(false);
    });
  });

  describe('readEntries', () => {
    it('should return empty array when log file does not exist', () => {
      const logPath = path.join(tmpDir, 'nonexistent.log');
      const logger = new AuditLogger({ logPath });

      expect(logger.readEntries()).toEqual([]);
    });

    it('should read all entries from log file', () => {
      const logPath = path.join(tmpDir, 'audit.log');
      const logger = new AuditLogger({ logPath });

      logger.log(sampleEntry({ method: 'GET' }));
      logger.log(sampleEntry({ method: 'POST' }));

      const entries = logger.readEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].method).toBe('GET');
      expect(entries[1].method).toBe('POST');
    });

    it('should filter by tail count', () => {
      const logPath = path.join(tmpDir, 'audit.log');
      const logger = new AuditLogger({ logPath });

      for (let i = 0; i < 10; i++) {
        logger.log(sampleEntry({ durationMs: i }));
      }

      const entries = logger.readEntries({ tail: 3 });
      expect(entries).toHaveLength(3);
      expect(entries[0].durationMs).toBe(7);
      expect(entries[2].durationMs).toBe(9);
    });

    it('should filter by status code', () => {
      const logPath = path.join(tmpDir, 'audit.log');
      const logger = new AuditLogger({ logPath });

      logger.log(sampleEntry({ status: 200 }));
      logger.log(sampleEntry({ status: 401 }));
      logger.log(sampleEntry({ status: 200 }));
      logger.log(sampleEntry({ status: 500 }));

      const entries = logger.readEntries({ status: 401 });
      expect(entries).toHaveLength(1);
      expect(entries[0].status).toBe(401);
    });

    it('should filter by since date', () => {
      const logPath = path.join(tmpDir, 'audit.log');
      const logger = new AuditLogger({ logPath });

      logger.log(sampleEntry({ timestamp: '2026-02-01T00:00:00.000Z' }));
      logger.log(sampleEntry({ timestamp: '2026-02-10T00:00:00.000Z' }));
      logger.log(sampleEntry({ timestamp: '2026-02-13T00:00:00.000Z' }));

      const entries = logger.readEntries({ since: '2026-02-10' });
      expect(entries).toHaveLength(2);
    });

    it('should filter by until date', () => {
      const logPath = path.join(tmpDir, 'audit.log');
      const logger = new AuditLogger({ logPath });

      logger.log(sampleEntry({ timestamp: '2026-02-01T00:00:00.000Z' }));
      logger.log(sampleEntry({ timestamp: '2026-02-10T00:00:00.000Z' }));
      logger.log(sampleEntry({ timestamp: '2026-02-13T00:00:00.000Z' }));

      const entries = logger.readEntries({ until: '2026-02-10T00:00:00.000Z' });
      expect(entries).toHaveLength(2);
    });

    it('should combine multiple filters', () => {
      const logPath = path.join(tmpDir, 'audit.log');
      const logger = new AuditLogger({ logPath });

      logger.log(sampleEntry({ timestamp: '2026-02-01T00:00:00.000Z', status: 200 }));
      logger.log(sampleEntry({ timestamp: '2026-02-05T00:00:00.000Z', status: 401 }));
      logger.log(sampleEntry({ timestamp: '2026-02-10T00:00:00.000Z', status: 401 }));
      logger.log(sampleEntry({ timestamp: '2026-02-13T00:00:00.000Z', status: 200 }));

      const entries = logger.readEntries({ since: '2026-02-03', status: 401 });
      expect(entries).toHaveLength(2);
      expect(entries[0].timestamp).toBe('2026-02-05T00:00:00.000Z');
    });

    it('should skip malformed lines', () => {
      const logPath = path.join(tmpDir, 'audit.log');
      fs.writeFileSync(logPath, '{"timestamp":"2026-02-13T12:00:00.000Z","method":"GET","path":"/api/v1/vaults","status":200,"durationMs":45}\nnot-json\n{"timestamp":"2026-02-13T13:00:00.000Z","method":"POST","path":"/api/v1/vaults","status":201,"durationMs":80}\n');

      const logger = new AuditLogger({ logPath });
      const entries = logger.readEntries();
      expect(entries).toHaveLength(2);
    });
  });

  describe('exportCsv', () => {
    it('should export entries as CSV with header', () => {
      const logger = new AuditLogger({ logPath: path.join(tmpDir, 'audit.log') });

      const entries: AuditEntry[] = [
        sampleEntry({ timestamp: '2026-02-13T12:00:00Z', method: 'GET', path: '/api/v1/vaults', status: 200, durationMs: 45 }),
        sampleEntry({ timestamp: '2026-02-13T12:01:00Z', method: 'POST', path: '/api/v1/vaults', status: 201, durationMs: 120 }),
      ];

      const csv = logger.exportCsv(entries);
      const lines = csv.trim().split('\n');
      expect(lines[0]).toBe('timestamp,method,path,status,durationMs');
      expect(lines[1]).toBe('2026-02-13T12:00:00Z,GET,/api/v1/vaults,200,45');
      expect(lines[2]).toBe('2026-02-13T12:01:00Z,POST,/api/v1/vaults,201,120');
    });

    it('should escape commas in paths', () => {
      const logger = new AuditLogger({ logPath: path.join(tmpDir, 'audit.log') });

      const entries: AuditEntry[] = [
        sampleEntry({ path: '/api/v1/vaults/a,b' }),
      ];

      const csv = logger.exportCsv(entries);
      expect(csv).toContain('"/api/v1/vaults/a,b"');
    });

    it('should return only header for empty entries', () => {
      const logger = new AuditLogger({ logPath: path.join(tmpDir, 'audit.log') });

      const csv = logger.exportCsv([]);
      expect(csv.trim()).toBe('timestamp,method,path,status,durationMs');
    });
  });
});
