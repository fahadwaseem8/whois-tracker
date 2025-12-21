import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET') || 'your-secret-key';
        // Support both numeric strings (seconds) and time strings (e.g., '7d', '1h')
        const expiration = configService.get<string>('JWT_EXPIRATION') || '7d';
        
        // If it's a pure number string, parse as seconds; otherwise use as-is (jsonwebtoken supports '7d', '1h', etc.)
        let expiresIn: number | StringValue;
        if (/^\d+$/.test(expiration)) {
          // Pure numeric string - treat as seconds
          expiresIn = parseInt(expiration, 10);
        } else {
          // Time string format (e.g., '7d', '1h', '30m') - use as string
          expiresIn = expiration as StringValue;
        }
        
        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
