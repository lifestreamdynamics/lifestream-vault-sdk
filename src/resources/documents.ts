import type { KyInstance } from 'ky';

export interface Document {
  id: string;
  vaultId: string;
  path: string;
  title: string | null;
  contentHash: string;
  sizeBytes: number;
  tags: string[];
  fileModifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentWithContent {
  document: Document;
  content: string;
}

export interface DocumentListItem {
  path: string;
  title: string | null;
  tags: string[];
  sizeBytes: number;
  fileModifiedAt: string;
}

export class DocumentsResource {
  constructor(private http: KyInstance) {}

  async list(vaultId: string, dirPath?: string): Promise<DocumentListItem[]> {
    const searchParams: Record<string, string> = {};
    if (dirPath) searchParams.dir = dirPath;
    const data = await this.http.get(`vaults/${vaultId}/documents`, { searchParams }).json<{ documents: DocumentListItem[] }>();
    return data.documents;
  }

  async get(vaultId: string, docPath: string): Promise<DocumentWithContent> {
    return this.http.get(`vaults/${vaultId}/documents/${docPath}`).json<DocumentWithContent>();
  }

  async put(vaultId: string, docPath: string, content: string): Promise<Document> {
    return this.http.put(`vaults/${vaultId}/documents/${docPath}`, {
      json: { content },
    }).json<Document>();
  }

  async delete(vaultId: string, docPath: string): Promise<void> {
    await this.http.delete(`vaults/${vaultId}/documents/${docPath}`);
  }

  async move(vaultId: string, sourcePath: string, destination: string, overwrite?: boolean): Promise<{ message: string; source: string; destination: string }> {
    return this.http.post(`vaults/${vaultId}/documents/${sourcePath}/move`, {
      json: { destination, overwrite },
    }).json();
  }

  async copy(vaultId: string, sourcePath: string, destination: string, overwrite?: boolean): Promise<{ message: string; source: string; destination: string }> {
    return this.http.post(`vaults/${vaultId}/documents/${sourcePath}/copy`, {
      json: { destination, overwrite },
    }).json();
  }
}
