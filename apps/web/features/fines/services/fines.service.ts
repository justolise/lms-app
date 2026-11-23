import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  FineEntry,
  MemberFineBalance,
  RecordPaymentPayload,
  WaiveFinePayload,
} from "../types/fines.types";

export const finesService = {
  async listLedger(params?: {
    userId?: string;
    entryType?: string;
    limit?: number;
    offset?: number;
  }): Promise<FineEntry[]> {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.set("userId", params.userId);
    if (params?.entryType) searchParams.set("entryType", params.entryType);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));

    const qs = searchParams.toString();
    const url = qs
      ? `${ENDPOINTS.fines.ledger}?${qs}`
      : ENDPOINTS.fines.ledger;
    return apiClient.get<FineEntry[]>(url);
  },

  async getMemberBalance(userId: string): Promise<MemberFineBalance> {
    return apiClient.get<MemberFineBalance>(ENDPOINTS.fines.balance(userId));
  },

  async recordPayment(
    payload: RecordPaymentPayload,
  ): Promise<FineEntry & { receiptNumber: string }> {
    return apiClient.post<FineEntry & { receiptNumber: string }>(
      ENDPOINTS.fines.payments,
      payload,
    );
  },

  async waiveFine(payload: WaiveFinePayload): Promise<FineEntry> {
    return apiClient.post<FineEntry>(ENDPOINTS.fines.waivers, payload);
  },
};
