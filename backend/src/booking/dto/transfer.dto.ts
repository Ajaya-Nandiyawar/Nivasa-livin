import { IsDateString, IsUUID } from 'class-validator';

export class TransferDto {
  @IsUUID()
  new_bed_id: string;

  @IsDateString()
  transfer_date: string;
}
