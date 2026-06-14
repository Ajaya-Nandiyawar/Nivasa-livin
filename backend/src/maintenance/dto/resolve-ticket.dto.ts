import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ResolveTicketDto {
  @IsString()
  resolution_notes: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost_incurred?: number;
}
