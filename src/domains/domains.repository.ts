import { Injectable, Inject } from '@nestjs/common';
import { Pool } from '@vercel/postgres';
import { DATABASE_POOL } from '../database/database.module';
import { Domain, CreateDomainDto } from './domain.interface';
import { WhoisRecord } from './whois-record.interface';
import { UserDomain } from './user-domain.interface';

@Injectable()
export class DomainsRepository {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  // Create domains table - stores unique domains being tracked
  async createDomainsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        domain_name VARCHAR(255) UNIQUE NOT NULL,
        last_checked_at TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_domains_domain_name ON domains(domain_name);
      CREATE INDEX IF NOT EXISTS idx_domains_last_checked_at ON domains(last_checked_at);
    `;
    await this.pool.query(query);
  }

  // Create user_domains junction table for many-to-many relationship
  async createUserDomainsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS user_domains (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, domain_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_domains_user_id ON user_domains(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_domains_domain_id ON user_domains(domain_id);
    `;
    await this.pool.query(query);
  }

  // Create whois_records table with one-to-one relationship to domains
  async createWhoisRecordsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS whois_records (
        id SERIAL PRIMARY KEY,
        domain_id INTEGER UNIQUE NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
        registrar VARCHAR(255),
        expiry_date TIMESTAMP,
        creation_date TIMESTAMP,
        raw_text TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_notification_sent_at TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_whois_records_domain_id ON whois_records(domain_id);
      CREATE INDEX IF NOT EXISTS idx_whois_records_expiry_date ON whois_records(expiry_date);
    `;
    await this.pool.query(query);
  }

  // Domain operations
  async createDomain(createDomainDto: CreateDomainDto): Promise<Domain> {
    const { domain_name } = createDomainDto;
    const result = await this.pool.query(
      'INSERT INTO domains (domain_name) VALUES ($1) ON CONFLICT (domain_name) DO UPDATE SET domain_name = EXCLUDED.domain_name RETURNING *',
      [domain_name],
    );
    return result.rows[0] as Domain;
  }

  async findDomainByName(domainName: string): Promise<Domain | null> {
    const result = await this.pool.query(
      'SELECT * FROM domains WHERE domain_name = $1',
      [domainName],
    );
    return (result.rows[0] as Domain) || null;
  }

  async findDomainById(domainId: number): Promise<Domain | null> {
    const result = await this.pool.query(
      'SELECT * FROM domains WHERE id = $1',
      [domainId],
    );
    return (result.rows[0] as Domain) || null;
  }

  async updateDomainLastChecked(
    domainId: number,
    timestamp: Date,
  ): Promise<Domain | null> {
    const result = await this.pool.query(
      'UPDATE domains SET last_checked_at = $2 WHERE id = $1 RETURNING *',
      [domainId, timestamp],
    );
    return (result.rows[0] as Domain) || null;
  }

  // User-Domain relationship operations
  async addDomainToUser(userId: string, domainId: number): Promise<UserDomain> {
    const result = await this.pool.query(
      'INSERT INTO user_domains (user_id, domain_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [userId, domainId],
    );
    return result.rows[0] as UserDomain;
  }

  async removeDomainFromUser(
    userId: string,
    domainId: number,
  ): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM user_domains WHERE user_id = $1 AND domain_id = $2',
      [userId, domainId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findDomainsByUserId(userId: string): Promise<Domain[]> {
    const result = await this.pool.query(
      `SELECT d.* FROM domains d
       INNER JOIN user_domains ud ON d.id = ud.domain_id
       WHERE ud.user_id = $1
       ORDER BY d.last_checked_at DESC NULLS LAST`,
      [userId],
    );
    return result.rows as Domain[];
  }

  async findDomainsByUserIdPaginated(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Domain[]> {
    const result = await this.pool.query(
      `SELECT d.* FROM domains d
       INNER JOIN user_domains ud ON d.id = ud.domain_id
       WHERE ud.user_id = $1
       ORDER BY d.last_checked_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return result.rows as Domain[];
  }

  async countDomainsByUserId(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM user_domains WHERE user_id = $1`,
      [userId],
    );
    return (result.rows[0] as { count: number }).count;
  }

  async isUserWatchingDomain(
    userId: string,
    domainId: number,
  ): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM user_domains WHERE user_id = $1 AND domain_id = $2',
      [userId, domainId],
    );
    return result.rows.length > 0;
  }

  // Get all unique domains for system-wide WHOIS checks
  async findAllDomains(): Promise<Domain[]> {
    const result = await this.pool.query(
      'SELECT * FROM domains ORDER BY last_checked_at ASC NULLS FIRST',
    );
    return result.rows as Domain[];
  }

  // WHOIS record operations
  async findWhoisRecordByDomainId(
    domainId: number,
  ): Promise<WhoisRecord | null> {
    const result = await this.pool.query(
      'SELECT * FROM whois_records WHERE domain_id = $1',
      [domainId],
    );
    return (result.rows[0] as WhoisRecord) || null;
  }

  async upsertWhoisRecord(
    domainId: number,
    registrar: string | null,
    expiryDate: Date | null,
    creationDate: Date | null,
    rawText: string,
  ): Promise<WhoisRecord> {
    const result = await this.pool.query(
      `INSERT INTO whois_records (domain_id, registrar, expiry_date, creation_date, raw_text, updated_at) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) 
       ON CONFLICT (domain_id) 
       DO UPDATE SET 
         registrar = $2,
         expiry_date = $3,
         creation_date = $4,
         raw_text = $5,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [domainId, registrar, expiryDate, creationDate, rawText],
    );
    return result.rows[0] as WhoisRecord;
  }

  async updateNotificationSentAt(
    domainId: number,
    timestamp: Date,
  ): Promise<void> {
    await this.pool.query(
      'UPDATE whois_records SET last_notification_sent_at = $2 WHERE domain_id = $1',
      [domainId, timestamp],
    );
  }

  // Get all domains with WHOIS data and user emails for notifications
  async findAllDomainsWithUsersAndWhois(): Promise<
    Array<{
      domainId: number;
      domainName: string;
      userId: string;
      userEmail: string;
      whois: WhoisRecord | null;
    }>
  > {
    const result = await this.pool.query(
      `SELECT 
        d.id as domain_id,
        d.domain_name,
        u.id as user_id,
        u.email as user_email,
        w.id as whois_id,
        w.domain_id as whois_domain_id,
        w.registrar,
        w.expiry_date,
        w.creation_date,
        w.raw_text,
        w.updated_at,
        w.last_notification_sent_at
       FROM domains d
       INNER JOIN user_domains ud ON d.id = ud.domain_id
       INNER JOIN users u ON ud.user_id = u.id
       LEFT JOIN whois_records w ON d.id = w.domain_id
       WHERE w.expiry_date IS NOT NULL
       ORDER BY d.id`,
    );

    return result.rows.map((row) => ({
      domainId: row.domain_id,
      domainName: row.domain_name,
      userId: row.user_id,
      userEmail: row.user_email,
      whois: row.whois_id
        ? {
            id: row.whois_id,
            domain_id: row.whois_domain_id,
            registrar: row.registrar,
            expiry_date: row.expiry_date,
            creation_date: row.creation_date,
            raw_text: row.raw_text,
            updated_at: row.updated_at,
            last_notification_sent_at: row.last_notification_sent_at,
          }
        : null,
    }));
  }

  // Combined operation: Get domain with WHOIS data
  async findDomainWithWhois(domainId: number): Promise<{
    domain: Domain;
    whois: WhoisRecord | null;
  } | null> {
    const result = await this.pool.query(
      `SELECT 
        d.*,
        json_build_object(
          'id', w.id,
          'domain_id', w.domain_id,
          'registrar', w.registrar,
          'expiry_date', w.expiry_date,
          'creation_date', w.creation_date,
          'raw_text', w.raw_text,
          'updated_at', w.updated_at,
          'last_notification_sent_at', w.last_notification_sent_at
        ) as whois
       FROM domains d
       LEFT JOIN whois_records w ON d.id = w.domain_id
       WHERE d.id = $1`,
      [domainId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      domain: {
        id: row.id,
        domain_name: row.domain_name,
        last_checked_at: row.last_checked_at,
      },
      whois: row.whois?.id ? row.whois : null,
    };
  }

  // Get domains watched by user with their WHOIS data
  async findDomainsWithWhoisByUserId(userId: string): Promise<
    Array<{
      domain: Domain;
      whois: WhoisRecord | null;
    }>
  > {
    const result = await this.pool.query(
      `SELECT 
        d.id as domain_id,
        d.domain_name,
        d.last_checked_at,
        w.id as whois_id,
        w.domain_id as whois_domain_id,
        w.registrar,
        w.expiry_date,
        w.creation_date,
        w.raw_text,
        w.updated_at as whois_updated_at,
        w.last_notification_sent_at
       FROM domains d
       INNER JOIN user_domains ud ON d.id = ud.domain_id
       LEFT JOIN whois_records w ON d.id = w.domain_id
       WHERE ud.user_id = $1
       ORDER BY d.last_checked_at DESC NULLS LAST`,
      [userId],
    );

    return result.rows.map((row) => ({
      domain: {
        id: row.domain_id,
        domain_name: row.domain_name,
        last_checked_at: row.last_checked_at,
      },
      whois: row.whois_id
        ? {
            id: row.whois_id,
            domain_id: row.whois_domain_id,
            registrar: row.registrar,
            expiry_date: row.expiry_date,
            creation_date: row.creation_date,
            raw_text: row.raw_text,
            updated_at: row.whois_updated_at,
            last_notification_sent_at: row.last_notification_sent_at,
          }
        : null,
    }));
  }
}
