import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReturnLoanDto {
  /** Barcode of the physical copy being returned */
  @IsString()
  @IsNotEmpty()
  barcode!: string;

  /** Optional idempotency key for safe retries */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
