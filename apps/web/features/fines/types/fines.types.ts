export type FineEntryType = "CHARGE" | "PAYMENT" | "WAIVER";
export type FinePaymentMethod = "CASH" | "MPESA" | "CARD";

export interface FineEntry {
  id: string;
  tenantId: string;
  userId: string;
  patronName: string;
  patronEmail: string | null;
  patronPhone: string | null;
  loanId: string | null;
  bookTitle: string | null;
  entryType: FineEntryType;
  amountMinorUnits: number;
  amountKes: number;
  paymentMethod: FinePaymentMethod | null;
  paymentReference: string | null;
  receiptNumber: string | null;
  waiverReason: string | null;
  actorId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MemberFineBalance {
  userId: string;
  totalChargedMinorUnits: number;
  totalPaidMinorUnits: number;
  totalWaivedMinorUnits: number;
  balanceMinorUnits: number;
  balanceKes: number;
}

export interface RecordPaymentPayload {
  userId: string;
  amountMinorUnits: number;
  paymentMethod: FinePaymentMethod;
  paymentReference?: string;
  notes?: string;
}

export interface WaiveFinePayload {
  userId: string;
  amountMinorUnits: number;
  waiverReason: string;
  loanId?: string;
  notes?: string;
}
