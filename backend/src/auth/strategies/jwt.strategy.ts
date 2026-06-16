import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from '../../config/env.config';
import { JwtPayload } from '../decorators/current-user.decorator';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService<EnvConfig>,
    private db: DatabaseService,
  ) {
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

    // Check if user exists, is active, and password has not changed since token issue
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'is_active', 'password_changed_at'])
      .where('id', '=', payload.sub)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (user.password_changed_at && payload.iat) {
      const passwordChangedTime = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
      if (payload.iat < passwordChangedTime) {
        throw new UnauthorizedException('Password was recently changed. Please log in again.');
      }
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
