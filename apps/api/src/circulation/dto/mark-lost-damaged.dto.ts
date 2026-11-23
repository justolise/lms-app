import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class MarkLostDamagedDto {
  /**
   * Barcode of the physical copy (preferred at the circulation desk).
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  /**
   * ID of the active loan (optional alternative to barcode).
   */
  @IsOptional()
  @IsUUID()
  loanId?: string;

  /**
   * Target status: either LOST or DAMAGED.
   */
  @IsIn(['LOST', 'DAMAGED'])
  status!: 'LOST' | 'DAMAGED';

  /**
   * Mandatory explanation/audit reason for marking the copy lost or damaged.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  /**
   * Replacement or damage fee in minor currency units (cents, e.g. 150000 = KES 1500.00).
   * If omitted or 0, no fine charge is posted.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  feeMinorUnits?: number = 0;
}
