import { IsIn } from 'class-validator';
import type { BedStatusEnum } from '../../database/types';

export class UpdateBedStatusDto {
  @IsIn(['VACANT', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'])
  status: BedStatusEnum;
}
