import { IsOptional, IsUUID, IsNumber, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ExpenseFilterDto {
  @IsOptional()
  @IsUUID()
  property_id?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

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
