import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ForgotPasswordDto {
  @IsOptional()
  @IsIn(['EMAIL', 'PHONE'])
  type?: 'EMAIL' | 'PHONE';

  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  identifier!: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
