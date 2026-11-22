import {
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone?: string;

  @IsUUID()
  memberTypeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  admissionNumber?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  photoUrl?: string;

  @IsOptional()
  @IsIn(['NATIONAL_ID', 'ALIEN_ID', 'PASSPORT', 'OTHER'])
  identifierType?: 'NATIONAL_ID' | 'ALIEN_ID' | 'PASSPORT' | 'OTHER';

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  identifierValue?: string;

  @IsOptional()
  @IsDateString()
  membershipExpiresAt?: string;
}
