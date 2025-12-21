import { Injectable, Inject } from '@nestjs/common';
import { Pool } from '@vercel/postgres';
import { DATABASE_POOL } from '../database/database.module';
import { Domain, CreateDomainDto } from './domain.interface';

@Injectable()
export class DomainsRepository {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async createDomainsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        domain VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, domain)
      );
      
      CREATE INDEX IF NOT EXISTS idx_domains_user_id ON domains(user_id);
      CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
    `;
    await this.pool.query(query);
  }

  async create(userId: number, createDomainDto: CreateDomainDto): Promise<Domain> {
    const { domain } = createDomainDto;
    const result = await this.pool.query(
      'INSERT INTO domains (user_id, domain) VALUES ($1, $2) RETURNING *',
      [userId, domain],
    );
    return result.rows[0] as Domain;
  }

  async findAllByUserId(userId: number): Promise<Domain[]> {
    const result = await this.pool.query(
      'SELECT * FROM domains WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return result.rows as Domain[];
  }

  async findOne(id: number, userId: number): Promise<Domain | null> {
    const result = await this.pool.query(
      'SELECT * FROM domains WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    return (result.rows[0] as Domain) || null;
  }

  async update(id: number, userId: number, data: Partial<Domain>): Promise<Domain | null> {
    const fields = Object.keys(data)
      .filter((key) => key !== 'id' && key !== 'user_id' && key !== 'created_at')
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');

    if (!fields) return this.findOne(id, userId);

    const values = Object.keys(data)
      .filter((key) => key !== 'id' && key !== 'user_id' && key !== 'created_at')
      .map((key) => data[key as keyof Domain])
      .filter((value) => value !== undefined);

    const result = await this.pool.query(
      `UPDATE domains SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, ...values],
    );
    return (result.rows[0] as Domain) || null;
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM domains WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

