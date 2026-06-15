import { IsNumber, Min } from 'class-validator';

export class UpdateRentDto {
  @IsNumber()
  @Min(0)
  monthly_rent: number;
}
