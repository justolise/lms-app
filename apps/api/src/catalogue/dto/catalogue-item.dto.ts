import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export type ItemFormat =
  | 'BOOK'
  | 'PERIODICAL'
  | 'REFERENCE'
  | 'AUDIO'
  | 'VIDEO'
  | 'OTHER';

export const ITEM_FORMATS: ItemFormat[] = [
  'BOOK',
  'PERIODICAL',
  'REFERENCE',
  'AUDIO',
  'VIDEO',
  'OTHER',
];

export class CreateCatalogueItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @IsOptional()
  @IsString()
  @Matches(/^\d{13}$/, { message: 'isbn13 must be a 13-digit string' })
  isbn13?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{9}[\dX]$/, { message: 'isbn10 must be a 10-character ISBN-10' })
  isbn10?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  publisher?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  publishedYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsEnum(ITEM_FORMATS)
  format?: ItemFormat;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  callNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shelfLocation?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];
}

export class UpdateCatalogueItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @IsOptional()
  @IsString()
  @Matches(/^\d{13}$/, { message: 'isbn13 must be a 13-digit string' })
  isbn13?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{9}[\dX]$/, { message: 'isbn10 must be a 10-character ISBN-10' })
  isbn10?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  publisher?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  publishedYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsEnum(ITEM_FORMATS)
  format?: ItemFormat;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  callNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shelfLocation?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];
}

export class IsbnLookupDto {
  @IsString()
  @Matches(/^\d{10}(\d{3})?$/, {
    message: 'isbn must be a 10 or 13 digit string (hyphens stripped)',
  })
  isbn!: string;
}

export class CatalogueItemIdParamDto {
  @IsUUID()
  itemId!: string;
}
