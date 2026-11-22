import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateLibraryProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Library name cannot be empty' })
  @MaxLength(200, { message: 'Library name cannot exceed 200 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Logo URL cannot exceed 500 characters' })
  logoUrl?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid contact email address' })
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Phone number cannot exceed 50 characters' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Address cannot exceed 500 characters' })
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Opening hours cannot exceed 1000 characters' })
  openingHours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Website URL cannot exceed 255 characters' })
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'Borrowing rules summary cannot exceed 2000 characters',
  })
  borrowingRulesSummary?: string;
}

export interface LibraryProfileResponseDto {
  id: string;
  name: string;
  libraryCode: string;
  status: string;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  openingHours: string | null;
  website: string | null;
  description: string | null;
  borrowingRulesSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
}
