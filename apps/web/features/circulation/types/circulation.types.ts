export interface Loan {
  id: string;
  userId: string;
  copyId: string;
  catalogueItemId: string;
  status: "ACTIVE" | "RETURNED" | "OVERDUE" | "LOST" | "DAMAGED";
  loanDurationDays: number;
  maxRenewals: number;
  gracePeriodDays: number;
  dailyFineMinorUnits: number;
  maxFineMinorUnits: number;
  checkedOutAt: string;
  dueAt: string;
  returnedAt: string | null;
  renewalCount: number;
  fineMinorUnits: number | null;
  overrideReason?: string | null;
  overrideActorId?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnLoanResult {
  loan: Loan;
  overdueDays: number;
  fineMinorUnits: number;
  fineKes: number;
  holdFulfilled?: boolean;
  claimantUserId?: string | null;
  holdExpiresAt?: string | null;
}

export interface CheckoutPayload {
  barcode: string;
  memberIdentifier: string;
  overrideReason?: string;
  idempotencyKey?: string;
}

export interface ReturnPayload {
  barcode: string;
  idempotencyKey?: string;
}

export interface MarkLostDamagedPayload {
  barcode?: string;
  loanId?: string;
  status: "LOST" | "DAMAGED";
  reason: string;
  feeMinorUnits?: number;
}

export interface MarkLostDamagedResult {
  success: boolean;
  copy: {
    id: string;
    barcode: string;
    status: string;
    notes?: string | null;
  };
  loan?: Loan;
  feeMinorUnits: number;
  feeKes: number;
  bookTitle: string;
}
