import type { KyInstance } from 'ky';

export interface Vault {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export class VaultsResource {
  constructor(private http: KyInstance) {}

  async list(): Promise<Vault[]> {
    const data = await this.http.get('vaults').json<{ vaults: Vault[] }>();
    return data.vaults;
  }

  async get(vaultId: string): Promise<Vault> {
    return this.http.get(`vaults/${vaultId}`).json<Vault>();
  }

  async create(params: { name: string; description?: string }): Promise<Vault> {
    return this.http.post('vaults', { json: params }).json<Vault>();
  }

  async update(vaultId: string, params: { name?: string; description?: string | null }): Promise<Vault> {
    return this.http.put(`vaults/${vaultId}`, { json: params }).json<Vault>();
  }

  async delete(vaultId: string): Promise<void> {
    await this.http.delete(`vaults/${vaultId}`);
  }
}
