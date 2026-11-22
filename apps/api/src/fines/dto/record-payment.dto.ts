import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class RecordPaymentDto {
  @IsUUID()
  userId!: string;

  @IsInt()
  @Min(1)
  amountMinorUnits!: number;

  @IsIn(['CASH', 'MPESA', 'CARD'])
  paymentMethod!: 'CASH' | 'MPESA' | 'CARD';

  @IsOptional()
  @IsString()
  @MaxLength(128)
  paymentReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
