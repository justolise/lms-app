export type AuthRole = 'ADMIN' | 'LIBRARIAN' | 'TEACHER' | 'MEMBER' | 'PARENT';

export interface AccessTokenPayload {
  userId: string;
  tenantId: string;
  role: AuthRole;
  sessionId: string;
}
