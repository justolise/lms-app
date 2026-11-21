import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsIn(['EMAIL', 'PHONE'])
  type!: 'EMAIL' | 'PHONE';

  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
