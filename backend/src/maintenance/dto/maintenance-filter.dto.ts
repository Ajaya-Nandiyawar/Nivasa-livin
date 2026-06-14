import { IsOptional, IsUUID, IsIn, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { TicketStatusEnum, TicketPriorityEnum } from '../../database/types';

export class MaintenanceFilterDto {
  @IsOptional()
  @IsUUID()
  property_id?: string;

  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'])
  status?: TicketStatusEnum;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: TicketPriorityEnum;

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
