import { IsOptional, IsNumber, IsIn, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import type { RentStatusEnum } from '../../database/types';

export class RentFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  period_month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  period_year?: number;

  @IsOptional()
  @IsIn(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'])
  status?: RentStatusEnum;

  @IsOptional()
  @IsUUID()
  tenant_id?: string;
}
