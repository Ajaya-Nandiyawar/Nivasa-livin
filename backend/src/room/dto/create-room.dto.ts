import { IsString, IsNumber, IsOptional, IsUUID, IsIn, IsArray } from 'class-validator';
import type { RoomTypeEnum } from '../../database/types';

export class CreateRoomDto {
  @IsUUID()
  property_id: string;

  @IsUUID()
  floor_id: string;

  @IsString()
  room_number: string;

  @IsIn(['SINGLE', 'DOUBLE', 'TRIPLE', 'DORM'])
  room_type: RoomTypeEnum;

  @IsNumber()
  monthly_rent: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}
