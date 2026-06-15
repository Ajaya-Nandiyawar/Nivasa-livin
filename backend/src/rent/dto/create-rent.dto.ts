import { IsString, IsNumber, IsNotEmpty, Min, Max, IsUUID, IsDateString } from 'class-validator';

export class CreateRentDto {
  @IsUUID()
  @IsNotEmpty()
  tenant_id: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  period_month: number;

  @IsNumber()
  period_year: number;

  @IsNumber()
  @Min(0)
  rent_amount: number;

  @IsDateString()
  due_date: string;
}
