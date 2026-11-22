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

// ─── Public catalogue query ───────────────────────────────────────────────────

export class PublicSearchDto {
  /** Library code, e.g. TEST-LIB. Optional; defaults to the primary active library. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'libraryCode must contain only uppercase letters, digits and hyphens',
  })
  libraryCode?: string;

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
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

// ─── Public catalogue item detail ─────────────────────────────────────────────

export class PublicItemParamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'libraryCode must contain only uppercase letters, digits and hyphens',
  })
  libraryCode!: string;

  @IsString()
  itemId!: string;
}

// ─── Membership enquiry ───────────────────────────────────────────────────────

export type MemberTypeEnquiry =
  | 'STUDENT'
  | 'TEACHER'
  | 'COMMUNITY'
  | 'STAFF'
  | 'OTHER';

export class MembershipEnquiryDto {
  /**
   * Library code that the patron is enquiring about.
   * Optional; defaults to the primary active library.
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'libraryCode must contain only uppercase letters, digits and hyphens',
  })
  libraryCode?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsString()
  @MinLength(7)
  @MaxLength(30)
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  idNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  memberType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  organization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
