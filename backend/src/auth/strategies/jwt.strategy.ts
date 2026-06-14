import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from '../../config/env.config';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService<EnvConfig>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: any): Promise<JwtPayload> {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid JWT payload');
    }
    return { 
      sub: payload.sub, 
      email: payload.email, 
      role: payload.role 
    };
  }
}
