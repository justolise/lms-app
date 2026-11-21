import { IsUUID } from 'class-validator';

export class SessionIdParamDto {
  @IsUUID()
  sessionId!: string;
}
