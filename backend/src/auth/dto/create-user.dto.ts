import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number',
  })
  password: string;

  @IsString()
  full_name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(['SUPER_ADMIN', 'PG_ADMIN', 'MANAGER', 'VIEWER'], {
    message: 'Role must be one of: SUPER_ADMIN, PG_ADMIN, MANAGER, VIEWER',
  })
  role: 'SUPER_ADMIN' | 'PG_ADMIN' | 'MANAGER' | 'VIEWER';
}
