import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Matches,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid E.164 number',
  })
  phone: string;

  @IsString()
  @IsNotEmpty()
  emergency_contact_name: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Emergency phone number must be a valid E.164 number',
  })
  emergency_contact_phone: string;

  @IsString()
  @Matches(/^\d{12}$/, { message: 'Aadhaar must be 12 digits' })
  aadhaar_number: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid PAN format' })
  pan_number?: string;

  @IsString()
  @IsNotEmpty()
  permanent_address: string;

  @IsDateString()
  dob: string;

  @IsString()
  @IsOptional()
  occupation?: string;

  @IsString()
  @IsOptional()
  blood_group?: string;

  // New fields
  @IsString()
  @IsOptional()
  guardian_name?: string;

  @IsString()
  @IsOptional()
  guardian_mobile?: string;

  @IsString()
  @IsOptional()
  guardian_relation?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  company_college?: string;

  @IsString()
  @IsOptional()
  lead_source?: string;

  @IsUUID()
  @IsOptional()
  referred_by_tenant_id?: string;

  // Booking fields
  @IsUUID()
  bed_id: string;

  @IsNumber()
  @Min(0)
  security_deposit: number;

  @IsNumber()
  @Min(0)
  monthly_rent: number;

  @IsDateString()
  check_in_date: string;

  @IsNumber()
  @Min(1)
  @Max(28)
  billing_date: number;
}
