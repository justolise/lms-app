import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty({ message: 'Library name is required' })
  @MaxLength(200, { message: 'Library name must be under 200 characters' })
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase alphanumeric characters and hyphens',
  })
  @MaxLength(100, { message: 'Slug must be under 100 characters' })
  slug?: string;

  @IsString()
  @IsNotEmpty({ message: 'Library code is required' })
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Library code must contain only uppercase alphanumeric characters and hyphens',
  })
  @MaxLength(40, { message: 'Library code must be under 40 characters' })
  libraryCode!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  openingHours?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  borrowingRulesSummary?: string;

  @IsOptional()
  @IsString()
  onboardingNotes?: string;
}

export class UpdateTenantStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED'], { message: 'Status must be ACTIVE or SUSPENDED' })
  status!: 'ACTIVE' | 'SUSPENDED';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListTenantsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';
}
