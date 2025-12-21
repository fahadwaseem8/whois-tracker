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
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    // Ensure sub is a number (JWT may decode it as string)
    const userId = typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;
    
    if (isNaN(userId)) {
      throw new UnauthorizedException('Invalid token payload');
    }
    
    const user = await this.authService.validateUser(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
