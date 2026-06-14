import { IsString, IsOptional, IsUUID, IsIn } from 'class-validator';
import type { TicketPriorityEnum } from '../../database/types';

export class CreateTicketDto {
  @IsUUID()
  property_id: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority: TicketPriorityEnum;

  @IsOptional()
  @IsUUID()
  reported_by?: string;

  @IsOptional()
  @IsUUID()
  room_id?: string;

  @IsOptional()
  @IsUUID()
  bed_id?: string;
}
