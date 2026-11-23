import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsIn(['EMAIL', 'PHONE'])
  type?: 'EMAIL' | 'PHONE';

  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
