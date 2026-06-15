import { IsString, IsNumber, IsOptional, Min, IsIn, IsDateString } from 'class-validator';
import type { RentStatusEnum } from '../../database/types';

export class UpdateRentDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  rent_amount?: number;

  @IsDateString()
  @IsOptional()
  due_date?: string;

  @IsString()
  @IsIn(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'])
  @IsOptional()
  status?: RentStatusEnum;
}
