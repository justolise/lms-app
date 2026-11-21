import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export type CopyCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
export type CopyStatus =
  | 'AVAILABLE'
  | 'ON_LOAN'
  | 'RESERVED'
  | 'IN_TRANSIT'
  | 'LOST'
  | 'DAMAGED'
  | 'WITHDRAWN';

export const COPY_CONDITIONS: CopyCondition[] = [
  'NEW',
  'GOOD',
  'FAIR',
  'POOR',
  'DAMAGED',
];

export class CreateCopyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  barcode!: string;

  @IsOptional()
  @IsEnum(COPY_CONDITIONS)
  condition?: CopyCondition;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shelfLocation?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  acquiredAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCopyDto {
  @IsOptional()
  @IsEnum(COPY_CONDITIONS)
  condition?: CopyCondition;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shelfLocation?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  acquiredAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CopyIdParamDto {
  @IsUUID()
  itemId!: string;

  @IsUUID()
  copyId!: string;
}
