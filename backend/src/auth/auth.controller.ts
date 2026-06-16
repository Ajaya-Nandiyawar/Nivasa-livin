import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Get,
  Patch,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: process.env.DISABLE_RATE_LIMIT === 'true' ? 1000 : 5, ttl: 900000 } }) // 5 attempts per 15 min (or 1000 if disabled)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.login(loginDto);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { accessToken, user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies['refresh_token'];
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (refreshToken) {
      await this.authService.logout(user.sub, refreshToken);
    }

    res.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Throttle({ default: { limit: process.env.DISABLE_RATE_LIMIT === 'true' ? 1000 : 3, ttl: 3600000 } }) // 3 attempts per hour (or 1000 if disabled)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { message: 'If the email exists, a reset link has been sent.' };
  }

  @Public()
  @Throttle({ default: { limit: process.env.DISABLE_RATE_LIMIT === 'true' ? 1000 : 10, ttl: 3600000 } }) // 10 attempts per hour (or 1000 if disabled)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password has been reset successfully.' };
  }

  @Get('me')
  async getProfile(@CurrentUser() user: JwtPayload) {
    const fullUser = await this.authService.getProfile(user.sub);
    return { user: fullUser };
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    const updatedUser = await this.authService.updateProfile(user.sub, dto);
    return { user: updatedUser, message: 'Profile updated successfully' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.sub, dto);
    return { message: 'Password changed successfully' };
  }

  @Get('users')
  @Roles('SUPER_ADMIN')
  async getUsers() {
    const users = await this.authService.getUsers();
    return { users };
  }

  @Post('users')
  @Roles('SUPER_ADMIN')
  async createUser(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateUserDto,
  ) {
    const newUser = await this.authService.createUser(dto, user.sub);
    return { user: newUser, message: 'User account created successfully' };
  }

  @Patch('users/:id')
  @Roles('SUPER_ADMIN')
  async updateUser(
    @CurrentUser() adminUser: JwtPayload,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    const updatedUser = await this.authService.updateUser(userId, dto, adminUser.sub);
    return { user: updatedUser, message: 'User account updated successfully' };
  }
}
