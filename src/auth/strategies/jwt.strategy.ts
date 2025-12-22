import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../interfaces/auth.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET') || 'your-secret-key';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    try {
      const userId = payload.sub;

      if (!userId || typeof userId !== 'string') {
        throw new UnauthorizedException('Invalid token payload');
      }

      const user = await this.authService.validateUser(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return user;
    } catch (error) {
      // Re-throw UnauthorizedException as-is, but log other errors
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('JWT validation error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
