import { apiClient } from "@/lib/api/client";
import type {
  CheckoutPayload,
  Loan,
  ReturnLoanResult,
  ReturnPayload,
} from "../types/circulation.types";

export const circulationService = {
  checkout(payload: CheckoutPayload) {
    return apiClient.post<Loan>("/api/circulation/checkout", payload);
  },

  returnLoan(payload: ReturnPayload) {
    return apiClient.post<ReturnLoanResult>("/api/circulation/return", payload);
  },

  renew(loanId: string) {
    return apiClient.post<Loan>(`/api/circulation/renew/${loanId}`);
  },

  async getActiveLoans(userId?: string): Promise<Loan[]> {
    return this.listLoans("ACTIVE", userId);
  },

  async listLoans(status?: string, userId?: string): Promise<Loan[]> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (userId) params.set("userId", userId);
    const endpoint = params.toString()
      ? `/api/circulation/loans?${params.toString()}`
      : "/api/circulation/loans";
    const data = await apiClient.get<Loan[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
};
