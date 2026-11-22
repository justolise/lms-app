import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CheckoutDto {
  /** Barcode of the physical copy to check out */
  @IsString()
  @IsNotEmpty()
  barcode!: string;

  /** Member identifier: admission number, email, or UUID */
  @IsString()
  @IsNotEmpty()
  memberIdentifier!: string;

  /**
   * Optional idempotency key — if supplied, duplicate requests with the same
   * key return the original loan record rather than throwing a conflict.
   */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  /**
   * CIR-5: Librarian override reason. Required when bypassing a soft block
   * (suspended/expired membership/fine balance). NOT accepted for hard blocks
   * (copy status, max concurrent loans).
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  overrideReason?: string;
}
