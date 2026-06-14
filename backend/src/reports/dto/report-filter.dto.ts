import { IsOptional, IsUUID, IsDateString } from 'class-validator';

export class ReportFilterDto {
  @IsOptional()
  @IsUUID()
  property_id?: string;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;
}
