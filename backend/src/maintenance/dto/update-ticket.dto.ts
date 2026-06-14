import { IsOptional, IsUUID, IsIn } from 'class-validator';
import type { TicketStatusEnum } from '../../database/types';

export class UpdateTicketDto {
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'])
  status?: TicketStatusEnum;

  @IsOptional()
  @IsUUID()
  assigned_to?: string;
}
