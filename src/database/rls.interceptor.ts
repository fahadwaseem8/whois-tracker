import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Pool } from '@vercel/postgres';
import { DATABASE_POOL } from './database.module';

@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    const user = request.user;

    // If user is authenticated, set the RLS context variable
    if (user && user.id) {
      try {
        // Set the user_id in the PostgreSQL session for RLS
        await this.pool.query(`SELECT set_config('app.user_id', $1, false)`, [
          user.id,
        ]);
      } catch (error) {
        console.error('Failed to set RLS context:', error);
      }
    }

    return next.handle();
  }
}
