import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
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
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
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

      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

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

      const payload = {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };

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
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

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

    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

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
        .set({ 
          password_hash: hash, 
          password_changed_at: new Date(),
          updated_at: new Date() 
        })
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

      // Write audit log
      await this.db
        .insertInto('audit_logs')
        .values({
          user_id: decoded.sub,
          action: 'PASSWORD_RESET',
          entity_type: 'users',
          entity_id: decoded.sub,
          old_values: null,
          new_values: null,
        })
        .execute();
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'email', 'role', 'full_name', 'phone', 'is_active', 'created_at', 'updated_at'])
      .where('id', '=', userId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', userId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Email uniqueness check
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', dto.email)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    // Perform update
    await this.db
      .updateTable('users')
      .set({
        ...dto,
        updated_at: new Date(),
      })
      .where('id', '=', userId)
      .execute();

    // Write audit log
    await this.db
      .insertInto('audit_logs')
      .values({
        user_id: userId,
        action: 'PROFILE_UPDATED',
        entity_type: 'users',
        entity_id: userId,
        old_values: JSON.stringify({
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
        }),
        new_values: JSON.stringify(dto),
      })
      .execute();

    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', userId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.current_password, user.password_hash);
    if (!isMatch) {
      throw new BadRequestException('Incorrect current password');
    }

    const saltRounds = 12;
    const hash = await bcrypt.hash(dto.new_password, saltRounds);

    await this.db
      .updateTable('users')
      .set({
        password_hash: hash,
        password_changed_at: new Date(),
        updated_at: new Date(),
      })
      .where('id', '=', userId)
      .execute();

    // Revoke all existing refresh tokens
    await this.db
      .updateTable('refresh_tokens')
      .set({ revoked_at: new Date() })
      .where('user_id', '=', userId)
      .where('revoked_at', 'is', null)
      .execute();

    // Write audit log
    await this.db
      .insertInto('audit_logs')
      .values({
        user_id: userId,
        action: 'PASSWORD_CHANGED',
        entity_type: 'users',
        entity_id: userId,
        old_values: null,
        new_values: null,
      })
      .execute();
  }

  async getUsers() {
    return this.db
      .selectFrom('users')
      .select(['id', 'email', 'role', 'full_name', 'phone', 'is_active', 'created_at', 'updated_at'])
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async createUser(dto: CreateUserDto, creatorId: string) {
    const existingUser = await this.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', dto.email)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const saltRounds = 12;
    const hash = await bcrypt.hash(dto.password, saltRounds);

    const result = await this.db
      .insertInto('users')
      .values({
        email: dto.email,
        password_hash: hash,
        role: dto.role,
        full_name: dto.full_name,
        phone: dto.phone || null,
      })
      .returning(['id', 'email', 'role', 'full_name', 'phone', 'is_active', 'created_at'])
      .executeTakeFirst();

    if (!result) {
      throw new BadRequestException('Failed to create user');
    }

    // Write audit log
    await this.db
      .insertInto('audit_logs')
      .values({
        user_id: creatorId,
        action: 'USER_CREATED',
        entity_type: 'users',
        entity_id: result.id,
        old_values: null,
        new_values: JSON.stringify(result),
      })
      .execute();

    return result;
  }

  async updateUser(userId: string, dto: UpdateUserDto, creatorId: string) {
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', userId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.db
      .updateTable('users')
      .set({
        ...dto,
        updated_at: new Date(),
      })
      .where('id', '=', userId)
      .execute();

    // Write audit log
    await this.db
      .insertInto('audit_logs')
      .values({
        user_id: creatorId,
        action: dto.is_active === false ? 'USER_DISABLED' : 'USER_UPDATED',
        entity_type: 'users',
        entity_id: userId,
        old_values: JSON.stringify({ role: user.role, is_active: user.is_active }),
        new_values: JSON.stringify(dto),
      })
      .execute();

    return this.getProfile(userId);
  }
}
