import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

/** A hook object returned by the API. */
export interface Hook {
  /** Unique hook identifier. */
  id: string;
  /** Vault this hook belongs to. */
  vaultId: string;
  /** Human-readable name for the hook. */
  name: string;
  /** Event that triggers the hook (e.g., `'document.create'`, `'document.update'`, `'document.delete'`). */
  triggerEvent: string;
  /** Optional filter for narrowing which events trigger the hook. */
  triggerFilter: Record<string, unknown> | null;
  /** The type of action to perform (e.g., `'auto-tag'`, `'template'`). */
  actionType: string;
  /** Configuration object for the action. */
  actionConfig: Record<string, unknown>;
  /** Whether the hook is currently active. */
  isActive: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string;
}

/** A hook execution log entry. */
export interface HookExecution {
  /** Unique execution identifier. */
  id: string;
  /** Hook that was executed. */
  hookId: string;
  /** Vault event that triggered the execution. */
  eventId: string;
  /** Execution status (e.g., `'success'`, `'error'`). */
  status: string;
  /** Duration of execution in milliseconds, or `null` if not recorded. */
  durationMs: number | null;
  /** Result data from the execution, or `null`. */
  result: unknown;
  /** Error message if the execution failed, or `null`. */
  error: string | null;
  /** ISO 8601 timestamp of when the execution occurred. */
  createdAt: string;
}

/** Parameters for creating a new hook. */
export interface CreateHookParams {
  /** Human-readable name for the hook. */
  name: string;
  /** Event that triggers the hook. */
  triggerEvent: string;
  /** Optional filter for narrowing trigger events. */
  triggerFilter?: Record<string, unknown> | null;
  /** The type of action to perform. */
  actionType: string;
  /** Configuration for the action. */
  actionConfig: Record<string, unknown>;
}

/** Parameters for updating an existing hook. */
export interface UpdateHookParams {
  /** New name for the hook. */
  name?: string;
  /** Whether the hook should be active. */
  isActive?: boolean;
  /** New trigger event. */
  triggerEvent?: string;
  /** New trigger filter. */
  triggerFilter?: Record<string, unknown> | null;
  /** New action type. */
  actionType?: string;
  /** New action configuration. */
  actionConfig?: Record<string, unknown>;
}

/**
 * Resource for managing vault hooks.
 *
 * Hooks are internal event handlers that run automatically when document
 * events occur within a vault. They can perform actions such as auto-tagging,
 * template application, and other automated workflows.
 *
 * Requires a **pro** or higher subscription tier.
 *
 * @example
 * ```typescript
 * const hooks = await client.hooks.list('vault-123');
 * const hook = await client.hooks.create('vault-123', {
 *   name: 'Auto-tag on create',
 *   triggerEvent: 'document.create',
 *   actionType: 'auto-tag',
 *   actionConfig: { tags: ['new'] },
 * });
 * ```
 */
export class HooksResource {
  constructor(private http: KyInstance) {}

  /**
   * Lists all hooks for a vault.
   *
   * @param vaultId - The vault to list hooks for
   * @returns Array of hook objects
   * @throws {AuthenticationError} If not authenticated
   * @throws {AuthorizationError} If the user lacks access to the vault
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const hooks = await client.hooks.list('vault-123');
   * for (const hook of hooks) {
   *   console.log(hook.name, hook.triggerEvent, hook.isActive);
   * }
   * ```
   */
  async list(vaultId: string): Promise<Hook[]> {
    try {
      const data = await this.http.get(`vaults/${vaultId}/hooks`).json<{ hooks: Hook[] }>();
      return data.hooks;
    } catch (error) {
      throw await handleError(error, 'Hooks', vaultId);
    }
  }

  /**
   * Creates a new hook in a vault.
   *
   * @param vaultId - The vault to create the hook in
   * @param params - Hook creation parameters
   * @returns The created hook object
   * @throws {ValidationError} If parameters are invalid
   * @throws {AuthenticationError} If not authenticated
   * @throws {AuthorizationError} If the user lacks access to the vault
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const hook = await client.hooks.create('vault-123', {
   *   name: 'Auto-tag new docs',
   *   triggerEvent: 'document.create',
   *   actionType: 'auto-tag',
   *   actionConfig: { tags: ['new'] },
   * });
   * ```
   */
  async create(vaultId: string, params: CreateHookParams): Promise<Hook> {
    try {
      return await this.http.post(`vaults/${vaultId}/hooks`, { json: params }).json<Hook>();
    } catch (error) {
      throw await handleError(error, 'Hook', params.name);
    }
  }

  /**
   * Updates an existing hook.
   *
   * Only the provided fields are modified; omitted fields remain unchanged.
   *
   * @param vaultId - The vault the hook belongs to
   * @param hookId - The hook to update
   * @param params - Fields to update
   * @returns The updated hook object
   * @throws {ValidationError} If parameters are invalid
   * @throws {NotFoundError} If the hook does not exist in the vault
   * @throws {AuthenticationError} If not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const updated = await client.hooks.update('vault-123', 'hook-456', {
   *   name: 'Renamed Hook',
   *   isActive: false,
   * });
   * ```
   */
  async update(vaultId: string, hookId: string, params: UpdateHookParams): Promise<Hook> {
    try {
      return await this.http.put(`vaults/${vaultId}/hooks/${hookId}`, { json: params }).json<Hook>();
    } catch (error) {
      throw await handleError(error, 'Hook', hookId);
    }
  }

  /**
   * Deletes a hook permanently.
   *
   * @param vaultId - The vault the hook belongs to
   * @param hookId - The hook to delete
   * @throws {NotFoundError} If the hook does not exist in the vault
   * @throws {AuthenticationError} If not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * await client.hooks.delete('vault-123', 'hook-456');
   * ```
   */
  async delete(vaultId: string, hookId: string): Promise<void> {
    try {
      await this.http.delete(`vaults/${vaultId}/hooks/${hookId}`);
    } catch (error) {
      throw await handleError(error, 'Hook', hookId);
    }
  }

  /**
   * Lists recent executions for a hook.
   *
   * Returns up to 50 most recent execution log entries, ordered by most recent first.
   *
   * @param vaultId - The vault the hook belongs to
   * @param hookId - The hook to get executions for
   * @returns Array of hook execution log entries
   * @throws {NotFoundError} If the hook does not exist in the vault
   * @throws {AuthenticationError} If not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const executions = await client.hooks.listExecutions('vault-123', 'hook-456');
   * for (const exec of executions) {
   *   console.log(exec.status, exec.durationMs, exec.createdAt);
   * }
   * ```
   */
  async listExecutions(vaultId: string, hookId: string): Promise<HookExecution[]> {
    try {
      const data = await this.http
        .get(`vaults/${vaultId}/hooks/${hookId}/executions`)
        .json<{ executions: HookExecution[] }>();
      return data.executions;
    } catch (error) {
      throw await handleError(error, 'Hook', hookId);
    }
  }
}
