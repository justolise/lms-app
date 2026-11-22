export interface LoanPolicy {
  id: string;
  itemFormat: string;
  loanDurationDays: number;
  maxConcurrentLoans: number;
  maxRenewals: number;
  gracePeriodDays: number;
  dailyFineMinorUnits: number;
  maxFineMinorUnits: number;
}

export interface MemberTypeSummary {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface MemberTypeDetail extends MemberTypeSummary {
  policies: LoanPolicy[];
}

export interface CreateMemberTypeInput {
  name: string;
  description?: string;
}

export interface UpdateMemberTypeInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpsertPolicyInput {
  itemFormat?: string;
  loanDurationDays: number;
  maxConcurrentLoans: number;
  maxRenewals: number;
  gracePeriodDays: number;
  dailyFineMinorUnits: number;
  maxFineMinorUnits: number;
}
