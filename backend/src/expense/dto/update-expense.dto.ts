import { IsString, IsOptional, IsUUID, IsNumber, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateExpenseDto {
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  expense_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
