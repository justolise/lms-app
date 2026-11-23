import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class PlatformLoginDto {
  @IsEmail({}, { message: 'A valid email is required' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;
}

export class PlatformMfaVerifyDto {
  @IsString()
  @IsNotEmpty({ message: 'Verification code is required' })
  code!: string;

  @IsOptional()
  @IsBoolean()
  isRecoveryCode?: boolean;

  @IsOptional()
  @IsString()
  tempToken?: string;
}

export interface PlatformAccessTokenPayload {
  platformUserId: string;
  email: string;
  fullName: string;
  role: 'PLATFORM_SUPER_ADMIN';
  sessionId: string;
  mfaVerified: boolean;
}

export interface PlatformTempMfaPayload {
  platformUserId: string;
  email: string;
  role: 'PLATFORM_SUPER_ADMIN';
  mfaPending: true;
}
