import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { EnvConfig } from '../config/env.config';
import { MailService } from '../core/mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService<EnvConfig>,
    private mailService: MailService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', loginDto.email)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // Hash refresh token for DB storage
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.db
      .insertInto('refresh_tokens')
      .values({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .execute();

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      const tokenRecord = await this.db
        .selectFrom('refresh_tokens')
        .selectAll()
        .where('token_hash', '=', tokenHash)
        .where('user_id', '=', decoded.sub)
        .where('revoked_at', 'is', null)
        .where('expires_at', '>', new Date())
        .executeTakeFirst();

      if (!tokenRecord) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const payload = { sub: decoded.sub, email: decoded.email, role: decoded.role };

      const newAccessToken = this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      });

      return { accessToken: newAccessToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await this.db
      .updateTable('refresh_tokens')
      .set({ revoked_at: new Date() })
      .where('user_id', '=', userId)
      .where('token_hash', '=', tokenHash)
      .execute();
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', dto.email)
      .executeTakeFirst();

    if (!user) {
      // Don't leak user existence
      return;
    }

    // In a real implementation, store this token in a reset_tokens table
    // For now, generate a signed JWT
    const resetToken = this.jwtService.sign(
      { sub: user.id },
      { secret: this.configService.get('JWT_ACCESS_SECRET'), expiresIn: '1h' },
    );

    const resetUrl = `https://nivasapg.com/reset-password?token=${resetToken}`;
    
    await this.mailService.sendMail(
      user.email,
      'Password Reset Request',
      `Click the link to reset your password: ${resetUrl}`,
      `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
    );
  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      const decoded = this.jwtService.verify(dto.token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      const saltRounds = 12;
      const hash = await bcrypt.hash(dto.password, saltRounds);

      const result = await this.db
        .updateTable('users')
        .set({ password_hash: hash, updated_at: new Date() })
        .where('id', '=', decoded.sub)
        .executeTakeFirst();

      if (Number(result.numUpdatedRows) === 0) {
        throw new BadRequestException('Failed to update password');
      }
      
      // Revoke all existing refresh tokens
      await this.db
        .updateTable('refresh_tokens')
        .set({ revoked_at: new Date() })
        .where('user_id', '=', decoded.sub)
        .where('revoked_at', 'is', null)
        .execute();

    } catch (e) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }
}
