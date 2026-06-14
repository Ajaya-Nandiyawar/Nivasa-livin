import { IsOptional, IsIn, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { BookingStatusEnum } from '../../database/types';

export class BookingFilterDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'CHECKED_OUT', 'TRANSFERRED'])
  status?: BookingStatusEnum;

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
