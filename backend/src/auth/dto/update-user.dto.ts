import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsEnum(['SUPER_ADMIN', 'PG_ADMIN', 'MANAGER', 'VIEWER'], {
    message: 'Role must be one of: SUPER_ADMIN, PG_ADMIN, MANAGER, VIEWER',
  })
  @IsOptional()
  role?: 'SUPER_ADMIN' | 'PG_ADMIN' | 'MANAGER' | 'VIEWER';

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
