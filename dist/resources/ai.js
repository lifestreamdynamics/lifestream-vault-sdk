import { handleError } from '../handle-error.js';
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
    http;
    constructor(http) {
        this.http = http;
    }
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
    async chat(params) {
        const { signal, ...body } = params;
        try {
            return await this.http.post('ai/chat', { json: body, signal }).json();
        }
        catch (error) {
            throw await handleError(error, 'AI Chat', params.sessionId ?? '');
        }
    }
    /**
     * Sends a message to the AI chat and receives a streaming response.
     * Yields content chunks as they arrive via Server-Sent Events.
     *
     * @example
     * ```typescript
     * const stream = client.ai.chatStream({ message: 'Summarize my notes' });
     * let fullContent = '';
     * for await (const chunk of stream) {
     *   process.stdout.write(chunk.content);
     *   fullContent += chunk.content;
     * }
     * // The return value is available after iteration completes
     * ```
     */
    async *chatStream(params) {
        const { signal, ...body } = params;
        try {
            const response = await this.http.post('ai/chat', {
                json: body,
                signal,
                headers: { 'Accept': 'text/event-stream' },
            });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let sessionId = response.headers.get('X-Session-Id') ?? '';
            const sourcesHeader = response.headers.get('X-Sources');
            const sources = sourcesHeader ? JSON.parse(sourcesHeader) : [];
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';
                    for (const line of lines) {
                        if (!line.startsWith('data: '))
                            continue;
                        const data = JSON.parse(line.slice(6));
                        if (data.done) {
                            sessionId = data.sessionId ?? sessionId;
                            return { sessionId, sources };
                        }
                        if (data.content) {
                            yield { content: data.content };
                        }
                    }
                }
            }
            finally {
                reader.releaseLock();
            }
            return { sessionId, sources };
        }
        catch (error) {
            throw await handleError(error, 'AI Chat Stream', params.sessionId ?? '');
        }
    }
    /**
     * Creates a new empty AI chat session without sending a message.
     *
     * Useful for pre-creating named sessions before starting a conversation.
     * If no title is provided, the session will have a null title until a
     * message is sent via {@link AiResource.chat}.
     *
     * @param params - Optional session parameters
     * @param params.title - Optional title for the session (max 200 characters)
     * @param params.vaultId - Optional vault ID to scope the session to a specific vault
     * @returns The newly created session object
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user's subscription does not include AI features, or the vault does not belong to the user
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const session = await client.ai.createSession({ title: 'Q1 Planning Notes' });
     * console.log(session.id); // Use this ID with client.ai.chat()
     * ```
     */
    async createSession(params = {}) {
        try {
            const data = await this.http.post('ai/sessions', { json: params }).json();
            return data.session;
        }
        catch (error) {
            throw await handleError(error, 'AI Session', '');
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
    async listSessions() {
        try {
            const data = await this.http.get('ai/sessions').json();
            return data.sessions;
        }
        catch (error) {
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
    async getSession(sessionId) {
        try {
            return await this.http.get(`ai/sessions/${sessionId}`).json();
        }
        catch (error) {
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
    async deleteSession(sessionId) {
        try {
            await this.http.delete(`ai/sessions/${sessionId}`);
        }
        catch (error) {
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
    async summarize(vaultId, documentPath) {
        try {
            return await this.http.post('ai/summarize', {
                json: { vaultId, documentPath },
            }).json();
        }
        catch (error) {
            throw await handleError(error, 'AI Summarize', documentPath);
        }
    }
    /**
     * Async generator that yields all AI chat sessions.
     *
     * Note: The sessions list endpoint does not paginate today, so this yields all
     * results in a single batch. It exists for API consistency with other listAll() methods.
     *
     * @yields AiChatSession objects, ordered by most recent first
     */
    async *listAllSessions() {
        const sessions = await this.listSessions();
        for (const session of sessions) {
            yield session;
        }
    }
    async similar(params) {
        try {
            const searchParams = {
                documentId: params.documentId,
                vaultId: params.vaultId,
            };
            if (params.limit !== undefined) {
                searchParams.limit = String(params.limit);
            }
            return await this.http.get('ai/similar', { searchParams }).json();
        }
        catch (error) {
            throw await handleError(error, 'AI Similar', params.documentId);
        }
    }
    async assist(params) {
        try {
            return await this.http.post('ai/assist', { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'AI Assist', '');
        }
    }
    async suggest(params) {
        try {
            return await this.http.post('ai/suggest', { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'AI Suggest', params.documentPath);
        }
    }
}
//# sourceMappingURL=ai.js.map