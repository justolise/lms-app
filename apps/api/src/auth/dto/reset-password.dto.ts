import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @IsOptional()
  @IsIn(['EMAIL', 'PHONE'])
  type?: 'EMAIL' | 'PHONE';

  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
  })
  newPassword!: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
