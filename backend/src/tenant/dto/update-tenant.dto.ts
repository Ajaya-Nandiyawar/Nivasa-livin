import {
  IsString,
  IsOptional,
  IsEmail,
  Matches,
  IsDateString,
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
}
