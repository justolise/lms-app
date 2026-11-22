import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ITEM_FORMATS,
  type ItemFormat,
} from '../../catalogue/dto/catalogue-item.dto.js';

// ─── Public Library Info ──────────────────────────────────────────────────────

export interface PublicLibraryDto {
  id: string;
  name: string;
  slug: string;
  libraryCode: string;
  status: string;
}

// ─── Public Catalogue Search & Pagination Query ───────────────────────────────

export class PublicCatalogueQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(ITEM_FORMATS)
  format?: ItemFormat;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  publishedYear?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' || value === true || value === 1 || value === '1',
  )
  @IsBoolean()
  availableOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 24;
}

// ─── Public Book Summary DTO (Strict Whitelist, No Confidential Fields) ───────

export interface PublicBookSummaryDto {
  id: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  isbn13?: string | null;
  publisher?: string | null;
  publishedYear?: number | null;
  language: string;
  format: string;
  coverUrl?: string | null;
  callNumber?: string | null;
  shelfLocation?: string | null;
  subjects: string[];
  /** Approved availability: 'AVAILABLE' | 'ON_LOAN' | null (null means hide label) */
  availabilityStatus: 'AVAILABLE' | 'ON_LOAN' | null;
}

// ─── Public Catalogue Paginated Response ──────────────────────────────────────

export interface PublicCatalogueResponseDto {
  items: PublicBookSummaryDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Public Book Detail DTO ───────────────────────────────────────────────────

export interface PublicBookDetailDto extends PublicBookSummaryDto {
  description?: string | null;
  isbn10?: string | null;
  categoryName?: string | null;
}

// ─── Public Membership Enquiry Request DTO ────────────────────────────────────

export class SubmitMembershipEnquiryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  memberType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

// ─── Legacy/Compatibility DTOs ────────────────────────────────────────────────

export class PublicSearchDto extends PublicCatalogueQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  libraryCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class MembershipEnquiryDto extends SubmitMembershipEnquiryDto {
  @IsOptional()
  @IsString()
  libraryCode?: string;

  @IsOptional()
  @IsString()
  idNumber?: string;
}
