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

  getActiveLoans(userId?: string) {
    return apiClient.get<Loan[]>("/api/circulation/loans", {
      status: "ACTIVE",
      ...(userId ? { userId } : {}),
    });
  },
};
