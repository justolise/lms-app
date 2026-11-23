import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  CheckoutPayload,
  Loan,
  MarkLostDamagedPayload,
  MarkLostDamagedResult,
  ReturnLoanResult,
  ReturnPayload,
} from "../types/circulation.types";

export const circulationService = {
  checkout(payload: CheckoutPayload) {
    return apiClient.post<Loan>(ENDPOINTS.circulation.checkout, payload);
  },

  returnLoan(payload: ReturnPayload) {
    return apiClient.post<ReturnLoanResult>(
      ENDPOINTS.circulation.return,
      payload,
    );
  },

  renew(loanId: string) {
    return apiClient.post<Loan>(ENDPOINTS.circulation.renew(loanId));
  },

  markLostDamaged(payload: MarkLostDamagedPayload) {
    return apiClient.post<MarkLostDamagedResult>(
      ENDPOINTS.circulation.lostDamaged,
      payload,
    );
  },

  async getActiveLoans(userId?: string): Promise<Loan[]> {
    return this.listLoans("ACTIVE", userId);
  },

  async listLoans(status?: string, userId?: string): Promise<Loan[]> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (userId) params.set("userId", userId);
    const qs = params.toString();
    const endpoint = qs
      ? `${ENDPOINTS.circulation.loans}?${qs}`
      : ENDPOINTS.circulation.loans;
    const data = await apiClient.get<Loan[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
};
