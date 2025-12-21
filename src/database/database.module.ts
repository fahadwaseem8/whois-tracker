import { Module, Global } from '@nestjs/common';
import { createPool } from '@vercel/postgres';

export const DATABASE_POOL = 'DATABASE_POOL';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: () => {
        return createPool({
          connectionString: process.env.POSTGRES_URL,
        });
      },
    },
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule {}
