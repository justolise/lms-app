import { IsUUID } from 'class-validator';

export class MemberTypeIdParamDto {
  @IsUUID()
  memberTypeId!: string;
}

export class PolicyIdParamDto {
  @IsUUID()
  memberTypeId!: string;

  @IsUUID()
  policyId!: string;
}
