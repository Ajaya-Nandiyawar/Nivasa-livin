import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  @IsDateString()
  @IsOptional()
  check_out_date?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
