import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMemberTypeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateMemberTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateLoanPolicyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  itemFormat!: string;

  @IsInt()
  @Min(1)
  loanDurationDays!: number;

  @IsInt()
  @Min(1)
  maxConcurrentLoans!: number;

  @IsInt()
  @Min(0)
  maxRenewals!: number;

  @IsInt()
  @Min(0)
  gracePeriodDays!: number;

  @IsInt()
  @Min(0)
  dailyFineMinorUnits!: number;

  @IsInt()
  @Min(0)
  maxFineMinorUnits!: number;
}

export class UpdateLoanPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  loanDurationDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxConcurrentLoans?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRenewals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dailyFineMinorUnits?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxFineMinorUnits?: number;
}
