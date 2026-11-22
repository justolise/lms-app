import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ListLedgerDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsIn(['CHARGE', 'PAYMENT', 'WAIVER'])
  entryType?: 'CHARGE' | 'PAYMENT' | 'WAIVER';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
