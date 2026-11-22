import { apiClient } from "@/lib/api/client";
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
    const url = `/api/fines/ledger${qs ? `?${qs}` : ""}`;
    return apiClient.get<FineEntry[]>(url);
  },

  async getMemberBalance(userId: string): Promise<MemberFineBalance> {
    return apiClient.get<MemberFineBalance>(`/api/fines/balance/${userId}`);
  },

  async recordPayment(
    payload: RecordPaymentPayload,
  ): Promise<FineEntry & { receiptNumber: string }> {
    return apiClient.post<FineEntry & { receiptNumber: string }>(
      "/api/fines/payments",
      payload,
    );
  },

  async waiveFine(payload: WaiveFinePayload): Promise<FineEntry> {
    return apiClient.post<FineEntry>("/api/fines/waivers", payload);
  },
};
