import type { KyInstance } from 'ky';

export interface AiChatSession {
  id: string;
  title: string;
  vaultId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokensUsed: number;
  createdAt: string;
}

export class AiResource {
  constructor(private http: KyInstance) {}

  async chat(params: {
    message: string;
    sessionId?: string;
    vaultId?: string;
  }): Promise<{ sessionId: string; message: { role: string; content: string; sources: string[] }; tokensUsed: number }> {
    return this.http.post('ai/chat', { json: params }).json();
  }

  async listSessions(): Promise<AiChatSession[]> {
    const data = await this.http.get('ai/sessions').json<{ sessions: AiChatSession[] }>();
    return data.sessions;
  }

  async getSession(sessionId: string): Promise<{ session: AiChatSession; messages: AiChatMessage[] }> {
    return this.http.get(`ai/sessions/${sessionId}`).json();
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.http.delete(`ai/sessions/${sessionId}`);
  }

  async summarize(vaultId: string, documentPath: string): Promise<{ summary: string; keyTopics: string[]; tokensUsed: number }> {
    return this.http.post('ai/summarize', {
      json: { vaultId, documentPath },
    }).json();
  }
}
