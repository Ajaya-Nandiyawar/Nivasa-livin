import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsDateString,
  IsUUID,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class AddNoteDto {
  @IsString()
  @IsNotEmpty()
  note: string;
}

export class AddChargeDto {
  @IsString()
  @IsNotEmpty()
  charge_type: string; // RENT, FOOD, ELECTRICITY, LAUNDRY, LATE_FEE, DAMAGE, OTHER

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  due_date: string;
}

export class AddPaymentDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  payment_type: string; // RENT, DEPOSIT, UTILITY, OTHER

  @IsString()
  @IsNotEmpty()
  payment_mode: string; // UPI, BANK, CASH, CARD

  @IsString()
  @IsOptional()
  reference_number?: string;

  @IsDateString()
  payment_date: string;
}

export class AddDepositTransactionDto {
  @IsString()
  @IsNotEmpty()
  transaction_type: string; // DEPOSIT_RECEIVED, DEPOSIT_ADJUSTMENT, DEPOSIT_REFUND

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CreateAgreementDto {
  @IsString()
  @IsOptional()
  agreement_number?: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsNumber()
  @Min(0)
  rent_amount: number;

  @IsNumber()
  @Min(0)
  deposit_amount: number;

  @IsUUID()
  @IsOptional()
  document_id?: string;
}

export class AddTagDto {
  @IsString()
  @IsNotEmpty()
  tag: string; // VIP, CORPORATE, etc.
}

export class RoomTransferDto {
  @IsUUID()
  to_bed_id: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class CheckoutDto {
  @IsDateString()
  @IsOptional()
  notice_date?: string;

  @IsDateString()
  @IsOptional()
  planned_exit_date?: string;

  @IsDateString()
  @IsOptional()
  actual_exit_date?: string;

  @IsBoolean()
  @IsOptional()
  keys_returned?: boolean;

  @IsBoolean()
  @IsOptional()
  room_inspected?: boolean;

  @IsBoolean()
  @IsOptional()
  damage_found?: boolean;

  @IsString()
  @IsOptional()
  damage_notes?: string;

  @IsBoolean()
  @IsOptional()
  deposit_refunded?: boolean;

  @IsString()
  @IsOptional()
  checkout_status?: string; // NOTICE_GIVEN, INSPECTION_PENDING, SETTLEMENT_PENDING, READY_TO_VACATE, COMPLETED
}

export class LogCommunicationDto {
  @IsString()
  @IsNotEmpty()
  channel: string; // WHATSAPP, SMS, EMAIL, CALL

  @IsString()
  @IsNotEmpty()
  direction: string; // INBOUND, OUTBOUND

  @IsString()
  @IsNotEmpty()
  message: string;
}
