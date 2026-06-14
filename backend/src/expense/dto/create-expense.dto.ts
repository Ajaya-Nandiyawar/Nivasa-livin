import { IsString, IsUUID, IsNumber, Min, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
  @IsUUID()
  property_id: string;

  @IsUUID()
  category_id: string;

  @IsString()
  title: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  expense_date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
