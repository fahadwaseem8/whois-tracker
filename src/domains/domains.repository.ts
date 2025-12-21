import { Injectable, Inject } from '@nestjs/common';
import { Pool } from '@vercel/postgres';
import { DATABASE_POOL } from '../database/database.module';
import { Domain, CreateDomainDto } from './domain.interface';
import { WhoisRecord } from './whois-record.interface';

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

  async createWhoisRecordsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS whois_records (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) UNIQUE NOT NULL,
        whois_data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_whois_records_domain ON whois_records(domain);
      CREATE INDEX IF NOT EXISTS idx_whois_records_updated_at ON whois_records(updated_at);
    `;
    await this.pool.query(query);
  }

  async create(
    userId: number,
    createDomainDto: CreateDomainDto,
  ): Promise<Domain> {
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

  async findAllByUserIdPaginated(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<Domain[]> {
    const result = await this.pool.query(
      'SELECT * FROM domains WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset],
    );
    return result.rows as Domain[];
  }

  async countByUserId(userId: number): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*)::int as count FROM domains WHERE user_id = $1',
      [userId],
    );
    return (result.rows[0] as { count: number }).count;
  }

  async findOne(id: number, userId: number): Promise<Domain | null> {
    const result = await this.pool.query(
      'SELECT * FROM domains WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    return (result.rows[0] as Domain) || null;
  }

  async findByDomainAndUserId(
    domain: string,
    userId: number,
  ): Promise<Domain | null> {
    const result = await this.pool.query(
      'SELECT * FROM domains WHERE domain = $1 AND user_id = $2',
      [domain, userId],
    );
    return (result.rows[0] as Domain) || null;
  }

  async update(
    id: number,
    userId: number,
    data: Partial<Domain>,
  ): Promise<Domain | null> {
    const fields = Object.keys(data)
      .filter(
        (key) => key !== 'id' && key !== 'user_id' && key !== 'created_at',
      )
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');

    if (!fields) return this.findOne(id, userId);

    const values = Object.keys(data)
      .filter(
        (key) => key !== 'id' && key !== 'user_id' && key !== 'created_at',
      )
      .map((key) => data[key as keyof Domain])
      .filter((value) => value !== undefined);

    const result = await this.pool.query(
      `UPDATE domains SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, ...values],
    );
    return (result.rows[0] as Domain) || null;
  }

  async updateByDomain(
    domain: string,
    userId: number,
    data: Partial<Domain>,
  ): Promise<Domain | null> {
    const fields = Object.keys(data)
      .filter(
        (key) => key !== 'id' && key !== 'user_id' && key !== 'created_at',
      )
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');

    if (!fields) return this.findByDomainAndUserId(domain, userId);

    const values = Object.keys(data)
      .filter(
        (key) => key !== 'id' && key !== 'user_id' && key !== 'created_at',
      )
      .map((key) => data[key as keyof Domain])
      .filter((value) => value !== undefined);

    const result = await this.pool.query(
      `UPDATE domains SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE domain = $1 AND user_id = $2 RETURNING *`,
      [domain, userId, ...values],
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

  async deleteByDomain(domain: string, userId: number): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM domains WHERE domain = $1 AND user_id = $2',
      [domain, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findAll(): Promise<Domain[]> {
    const result = await this.pool.query(
      'SELECT * FROM domains ORDER BY created_at DESC',
    );
    return result.rows as Domain[];
  }

  async findWhoisRecordByDomain(domain: string): Promise<WhoisRecord | null> {
    const result = await this.pool.query(
      'SELECT * FROM whois_records WHERE domain = $1',
      [domain],
    );
    return (result.rows[0] as WhoisRecord) || null;
  }

  async upsertWhoisRecord(
    domain: string,
    whoisData: string,
  ): Promise<WhoisRecord> {
    const result = await this.pool.query(
      `INSERT INTO whois_records (domain, whois_data) 
       VALUES ($1, $2) 
       ON CONFLICT (domain) 
       DO UPDATE SET whois_data = $2, updated_at = CURRENT_TIMESTAMP 
       RETURNING *`,
      [domain, whoisData],
    );
    return result.rows[0] as WhoisRecord;
  }
}
