import { IsOptional, IsString, IsIn, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { BookingStatusEnum } from '../../database/types';

export class TenantFilterDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'CHECKED_OUT', 'TRANSFERRED'])
  status?: BookingStatusEnum;

  @IsOptional()
  @IsString()
  property_id?: string;

  @IsOptional()
  @IsString()
  floor_id?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
