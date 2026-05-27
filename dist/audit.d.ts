/**
 * Audit logging subpath. Node-only — uses `node:fs`/`path`/`os`. Cannot be
 * imported from React Native or browser bundles.
 *
 * Use this from server-side scripts, the CLI, or any Node consumer that wants
 * to record every SDK request to a rotating log file. Two ways:
 *
 *   1. Construct an `AuditLogger` directly to read or write log entries.
 *   2. Call `installAuditLogging(client)` after constructing your
 *      `LifestreamVaultClient` to install before/after hooks that record
 *      every request.
 */
import type { LifestreamVaultClient } from './client.js';
import { AuditLogger, type AuditLoggerOptions } from './lib/audit-logger.js';
export { AuditLogger };
export type { AuditEntry, AuditLoggerOptions } from './lib/audit-logger.js';
/**
 * Install audit-logging hooks on a `LifestreamVaultClient`. Records every
 * request's method, path, status, and duration to a rotating log file.
 *
 * Best-effort: log write failures never break in-flight requests.
 *
 * Returns the underlying `AuditLogger` so callers can later read or rotate.
 *
 * @example
 * ```ts
 * import { LifestreamVaultClient } from '@lifestreamdynamics/vault-sdk';
 * import { installAuditLogging } from '@lifestreamdynamics/vault-sdk/audit';
 *
 * const client = new LifestreamVaultClient({ accessToken: '...' });
 * const logger = installAuditLogging(client, { logPath: '/var/log/lsv.log' });
 * ```
 */
export declare function installAuditLogging(client: LifestreamVaultClient, options?: AuditLoggerOptions): AuditLogger;
//# sourceMappingURL=audit.d.ts.map