import type { LibraryMembershipClaim } from '../interfaces/token-payload.interface.js';

export interface LibrarySelectionPayload {
  memberships: LibraryMembershipClaim[];
}
