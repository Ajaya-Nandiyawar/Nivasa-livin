import {
  IsString,
  IsOptional,
  IsEmail,
  Matches,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  full_name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid E.164 number',
  })
  phone?: string;

  @IsString()
  @IsOptional()
  emergency_contact_name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Emergency phone number must be a valid E.164 number',
  })
  emergency_contact_phone?: string;

  @IsString()
  @IsOptional()
  permanent_address?: string;

  @IsDateString()
  @IsOptional()
  dob?: string;

  @IsString()
  @IsOptional()
  occupation?: string;

  @IsString()
  @IsOptional()
  blood_group?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{12}$/, { message: 'Aadhaar must be exactly 12 digits' })
  aadhaar_number?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid PAN format' })
  pan_number?: string;

  @IsString()
  @IsOptional()
  status?: string;

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
  kyc_status?: string;

  @IsString()
  @IsOptional()
  police_verification_status?: string;

  @IsString()
  @IsOptional()
  lead_source?: string;

  @IsUUID()
  @IsOptional()
  referred_by_tenant_id?: string;

  @IsString()
  @IsOptional()
  blacklist_reason?: string;
}
