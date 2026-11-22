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
