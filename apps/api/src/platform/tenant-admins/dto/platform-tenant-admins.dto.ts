import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class ProvisionTenantAdminDto {
  @IsEmail({}, { message: 'A valid email is required' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Temporary password must be at least 8 characters long' })
  temporaryPassword?: string;
}
