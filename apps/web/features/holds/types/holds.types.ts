export type HoldStatus =
  | "PENDING"
  | "READY"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED";

export interface Hold {
  id: string;
  tenantId: string;
  userId: string;
  catalogueItemId: string;
  copyId?: string | null;
  status: HoldStatus;
  pickupWindowHours: number;
  placedAt: string;
  readyAt?: string | null;
  expiresAt?: string | null;
  fulfilledAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  bookTitle?: string;
  userFullName?: string;
  userEmail?: string | null;
  userPhone?: string | null;
  queuePosition?: number;
}

export interface CreateHoldInput {
  catalogueItemId: string;
  userId?: string;
}

export interface CancelHoldInput {
  reason?: string;
}
