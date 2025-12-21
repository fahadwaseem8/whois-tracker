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
      // Ensure sub is a number (JWT may decode it as string)
      const userId = typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;
      
      if (isNaN(userId) || userId <= 0) {
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
