import { Injectable, Inject } from '@nestjs/common';
import { Pool } from '@vercel/postgres';
import { DATABASE_POOL } from '../database/database.module';
import { User, CreateUserDto } from './user.interface';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async createUsersTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
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

  async findById(id: number): Promise<User | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [
      id,
    ]);
    return (result.rows[0] as User) || null;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;
    const result = await this.pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *',
      [email, password],
    );
    return result.rows[0] as User;
  }

  async update(id: number, data: Partial<User>): Promise<User | null> {
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
      `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return (result.rows[0] as User) || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM users WHERE id = $1', [
      id,
    ]);
    return (result.rowCount ?? 0) > 0;
  }
}
