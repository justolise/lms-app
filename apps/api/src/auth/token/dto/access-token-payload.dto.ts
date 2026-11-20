export type AuthRole =
  'ADMIN' | 'LIBRARIAN' | 'TEACHER' | 'MEMBER' | 'PARENT' | 'GUEST';

export interface AccessTokenPayload {
  userId: string;
  tenantId: string;
  role: AuthRole;
  sessionId: string;
}
