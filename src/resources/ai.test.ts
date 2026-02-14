import { describe, it, expect, beforeEach } from 'vitest';
import { AiResource } from './ai.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, AuthenticationError, RateLimitError } from '../errors.js';

describe('AiResource', () => {
  let resource: AiResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new AiResource(kyMock as any);
  });

  describe('chat', () => {
    it('should send a chat message', async () => {
      const chatResponse = {
        sessionId: 's1',
        message: { role: 'assistant', content: 'Hello!', sources: [] },
        tokensUsed: 50,
      };
      mockJsonResponse(kyMock.post, chatResponse);

      const result = await resource.chat({ message: 'Hi' });

      expect(kyMock.post).toHaveBeenCalledWith('ai/chat', {
        json: { message: 'Hi' },
      });
      expect(result).toEqual(chatResponse);
    });

    it('should send chat with existing session', async () => {
      const chatResponse = {
        sessionId: 's1',
        message: { role: 'assistant', content: 'Follow up', sources: ['doc.md'] },
        tokensUsed: 80,
      };
      mockJsonResponse(kyMock.post, chatResponse);

      const result = await resource.chat({ message: 'Continue', sessionId: 's1' });

      expect(kyMock.post).toHaveBeenCalledWith('ai/chat', {
        json: { message: 'Continue', sessionId: 's1' },
      });
      expect(result).toEqual(chatResponse);
    });

    it('should send chat with vaultId scope', async () => {
      mockJsonResponse(kyMock.post, {
        sessionId: 's2',
        message: { role: 'assistant', content: 'Vault scoped', sources: [] },
        tokensUsed: 30,
      });

      await resource.chat({ message: 'Search vault', vaultId: 'v1' });

      expect(kyMock.post).toHaveBeenCalledWith('ai/chat', {
        json: { message: 'Search vault', vaultId: 'v1' },
      });
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.post, 401, { message: 'Token expired' });

      await expect(resource.chat({ message: 'Hi' })).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw RateLimitError on 429', async () => {
      mockHTTPError(kyMock.post, 429, { message: 'Rate limit exceeded' });

      await expect(resource.chat({ message: 'Hi' })).rejects.toBeInstanceOf(RateLimitError);
    });
  });

  describe('listSessions', () => {
    it('should list AI chat sessions', async () => {
      const sessions = [
        { id: 's1', title: 'Session 1', vaultId: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 's2', title: 'Session 2', vaultId: 'v1', createdAt: '2024-01-02', updatedAt: '2024-01-02' },
      ];
      mockJsonResponse(kyMock.get, { sessions });

      const result = await resource.listSessions();

      expect(kyMock.get).toHaveBeenCalledWith('ai/sessions');
      expect(result).toEqual(sessions);
    });

    it('should return empty array when no sessions', async () => {
      mockJsonResponse(kyMock.get, { sessions: [] });

      const result = await resource.listSessions();

      expect(result).toEqual([]);
    });
  });

  describe('getSession', () => {
    it('should get a session with messages', async () => {
      const sessionData = {
        session: { id: 's1', title: 'Chat', vaultId: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        messages: [
          { id: 'm1', role: 'user', content: 'Hi', tokensUsed: 5, createdAt: '2024-01-01' },
          { id: 'm2', role: 'assistant', content: 'Hello!', tokensUsed: 10, createdAt: '2024-01-01' },
        ],
      };
      mockJsonResponse(kyMock.get, sessionData);

      const result = await resource.getSession('s1');

      expect(kyMock.get).toHaveBeenCalledWith('ai/sessions/s1');
      expect(result).toEqual(sessionData);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Session not found' });

      await expect(resource.getSession('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      await resource.deleteSession('s1');

      expect(kyMock.delete).toHaveBeenCalledWith('ai/sessions/s1');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Not found' });

      await expect(resource.deleteSession('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('summarize', () => {
    it('should summarize a document', async () => {
      const summaryResult = {
        summary: 'This document covers...',
        keyTopics: ['topic1', 'topic2'],
        tokensUsed: 200,
      };
      mockJsonResponse(kyMock.post, summaryResult);

      const result = await resource.summarize('v1', 'notes/article.md');

      expect(kyMock.post).toHaveBeenCalledWith('ai/summarize', {
        json: { vaultId: 'v1', documentPath: 'notes/article.md' },
      });
      expect(result).toEqual(summaryResult);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.summarize('v1', 'doc.md')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
