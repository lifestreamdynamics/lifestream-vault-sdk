import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

/** An AI chat session with optional vault context. */
export interface AiChatSession {
  /** Unique session identifier. */
  id: string;
  /** Auto-generated or user-provided session title. */
  title: string;
  /** ID of the vault scoped to this session, or `null` for cross-vault sessions. */
  vaultId: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string;
}

/** A single message in an AI chat session. */
export interface AiChatMessage {
  /** Unique message identifier. */
  id: string;
  /** The role of the message sender. */
  role: 'user' | 'assistant' | 'system';
  /** Message text content. */
  content: string;
  /** Number of tokens consumed by this message. */
  tokensUsed: number;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/**
 * Resource for AI-powered chat and document analysis.
 *
 * Provides conversational AI with optional vault context for document-aware
 * responses, as well as standalone document summarization. Requires a
 * subscription tier that includes AI features.
 *
 * @example
 * ```typescript
 * const response = await client.ai.chat({
 *   message: 'Summarize my recent meeting notes',
 *   vaultId: 'vault-uuid',
 * });
 * console.log(response.message.content);
 * ```
 */
export class AiResource {
  constructor(private http: KyInstance) {}

  /**
   * Sends a message to the AI chat and receives a response.
   *
   * If `sessionId` is provided, the message is appended to an existing
   * conversation. Otherwise, a new session is created automatically.
   * When `vaultId` is provided, the AI has access to documents in that
   * vault for context-aware responses.
   *
   * @param params - Chat parameters
   * @param params.message - The user's message text (required)
   * @param params.sessionId - Optional existing session ID to continue a conversation
   * @param params.vaultId - Optional vault ID to scope the AI's document context
   * @returns The AI response with session ID, message content, document sources, and token usage
   * @throws {NotFoundError} If the specified session or vault does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user's subscription does not include AI features
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * // Start a new conversation
   * const response = await client.ai.chat({
   *   message: 'What are my open action items?',
   *   vaultId: 'vault-uuid',
   * });
   * console.log(response.message.content);
   * console.log('Sources:', response.message.sources);
   *
   * // Continue the conversation
   * const followUp = await client.ai.chat({
   *   message: 'Which ones are due this week?',
   *   sessionId: response.sessionId,
   * });
   * ```
   *
   * @see {@link AiResource.listSessions} to list past conversations
   */
  async chat(params: {
    message: string;
    sessionId?: string;
    vaultId?: string;
  }): Promise<{ sessionId: string; message: { role: string; content: string; sources: string[] }; tokensUsed: number }> {
    try {
      return await this.http.post('ai/chat', { json: params }).json();
    } catch (error) {
      throw await handleError(error, 'AI Chat', params.sessionId ?? '');
    }
  }

  /**
   * Lists all AI chat sessions for the authenticated user.
   *
   * @returns Array of chat session objects, ordered by most recent first
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user's subscription does not include AI features
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const sessions = await client.ai.listSessions();
   * for (const session of sessions) {
   *   console.log(session.title, session.createdAt);
   * }
   * ```
   */
  async listSessions(): Promise<AiChatSession[]> {
    try {
      const data = await this.http.get('ai/sessions').json<{ sessions: AiChatSession[] }>();
      return data.sessions;
    } catch (error) {
      throw await handleError(error, 'AI Sessions', '');
    }
  }

  /**
   * Retrieves a chat session with its full message history.
   *
   * @param sessionId - The unique identifier of the session
   * @returns The session metadata and array of all messages in chronological order
   * @throws {NotFoundError} If no session exists with the given ID
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user's subscription does not include AI features
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const { session, messages } = await client.ai.getSession('session-uuid');
   * console.log(`Session: ${session.title}`);
   * for (const msg of messages) {
   *   console.log(`[${msg.role}] ${msg.content}`);
   * }
   * ```
   */
  async getSession(sessionId: string): Promise<{ session: AiChatSession; messages: AiChatMessage[] }> {
    try {
      return await this.http.get(`ai/sessions/${sessionId}`).json();
    } catch (error) {
      throw await handleError(error, 'AI Session', sessionId);
    }
  }

  /**
   * Permanently deletes a chat session and all its messages.
   *
   * This action is irreversible.
   *
   * @param sessionId - The unique identifier of the session to delete
   * @throws {NotFoundError} If no session exists with the given ID
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user's subscription does not include AI features
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * await client.ai.deleteSession('session-uuid');
   * ```
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.http.delete(`ai/sessions/${sessionId}`);
    } catch (error) {
      throw await handleError(error, 'AI Session', sessionId);
    }
  }

  /**
   * Generates an AI summary of a specific document.
   *
   * Analyzes the document content and produces a concise summary along
   * with a list of key topics identified in the text.
   *
   * @param vaultId - The vault ID containing the document
   * @param documentPath - File path of the document to summarize
   * @returns Object containing the summary text, extracted key topics, and token usage
   * @throws {NotFoundError} If the vault or document does not exist
   * @throws {AuthenticationError} If the request is not authenticated
   * @throws {AuthorizationError} If the user's subscription does not include AI features
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const result = await client.ai.summarize('vault-uuid', 'notes/long-article.md');
   * console.log(result.summary);
   * console.log('Key topics:', result.keyTopics.join(', '));
   * console.log(`Tokens used: ${result.tokensUsed}`);
   * ```
   *
   * @see {@link AiResource.chat} for interactive document Q&A
   */
  async summarize(vaultId: string, documentPath: string): Promise<{ summary: string; keyTopics: string[]; tokensUsed: number }> {
    try {
      return await this.http.post('ai/summarize', {
        json: { vaultId, documentPath },
      }).json();
    } catch (error) {
      throw await handleError(error, 'AI Summarize', documentPath);
    }
  }
}
