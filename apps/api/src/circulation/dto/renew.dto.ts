import { IsUUID } from 'class-validator';

export class RenewDto {
  @IsUUID()
  loanId!: string;
}
