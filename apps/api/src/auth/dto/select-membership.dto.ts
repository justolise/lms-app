import { IsUUID } from 'class-validator';

export class SelectMembershipDto {
  @IsUUID()
  tenantId!: string;
}
