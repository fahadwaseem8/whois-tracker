import { Injectable, Inject } from '@nestjs/common';
import { Pool } from '@vercel/postgres';
import { DATABASE_POOL } from '../database/database.module';
import { User, CreateUserDto } from './user.interface';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async createUsersTable(): Promise<void> {
    const query = `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      
      -- Enable RLS
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      
      -- Policy: Users can only see their own user record
      DROP POLICY IF EXISTS users_select_policy ON users;
      CREATE POLICY users_select_policy ON users
        FOR SELECT
        USING (id = current_setting('app.user_id', true)::uuid);
      
      -- Policy: Anyone can insert (for registration)
      DROP POLICY IF EXISTS users_insert_policy ON users;
      CREATE POLICY users_insert_policy ON users
        FOR INSERT
        WITH CHECK (true);
      
      -- Policy: Users can only update their own record
      DROP POLICY IF EXISTS users_update_policy ON users;
      CREATE POLICY users_update_policy ON users
        FOR UPDATE
        USING (id = current_setting('app.user_id', true)::uuid);
      
      -- Policy: Users can only delete their own record
      DROP POLICY IF EXISTS users_delete_policy ON users;
      CREATE POLICY users_delete_policy ON users
        FOR DELETE
        USING (id = current_setting('app.user_id', true)::uuid);
    `;
    await this.pool.query(query);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    return (result.rows[0] as User) || null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [
      id,
    ]);
    return (result.rows[0] as User) || null;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;
    const result = await this.pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [email, password],
    );
    return result.rows[0] as User;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const fields = Object.keys(data)
      .filter((key) => key !== 'id')
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    if (!fields) return this.findById(id);

    const values = Object.keys(data)
      .filter((key) => key !== 'id')
      .map((key) => data[key as keyof User])
      .filter((value) => value !== undefined);

    const result = await this.pool.query(
      `UPDATE users SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return (result.rows[0] as User) || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM users WHERE id = $1', [
      id,
    ]);
    return (result.rowCount ?? 0) > 0;
  }
}
