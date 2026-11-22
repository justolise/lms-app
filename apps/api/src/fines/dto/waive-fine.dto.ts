import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class WaiveFineDto {
  @IsUUID()
  userId!: string;

  @IsInt()
  @Min(1)
  amountMinorUnits!: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(500)
  waiverReason!: string;

  @IsOptional()
  @IsUUID()
  loanId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
