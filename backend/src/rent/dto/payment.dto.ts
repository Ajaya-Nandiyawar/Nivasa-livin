import { IsNumber, IsIn, IsString, IsOptional, Min } from 'class-validator';
import type { PaymentModeEnum } from '../../database/types';

export class PaymentDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsIn(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'])
  payment_mode: PaymentModeEnum;

  @IsString()
  @IsOptional()
  reference_number?: string;
}
