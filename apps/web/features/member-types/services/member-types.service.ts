import { apiClient } from "@/lib/api/client";
import type {
  CreateMemberTypeInput,
  LoanPolicy,
  MemberTypeDetail,
  MemberTypeSummary,
  UpdateMemberTypeInput,
  UpsertPolicyInput,
} from "../types/member-types.types";

export const memberTypesService = {
  async list(): Promise<MemberTypeSummary[]> {
    const data = await apiClient.get<MemberTypeSummary[]>("/api/member-types");
    return Array.isArray(data) ? data : [];
  },

  async getById(id: string): Promise<MemberTypeDetail> {
    return apiClient.get<MemberTypeDetail>(`/api/member-types/${id}`);
  },

  async create(payload: CreateMemberTypeInput): Promise<MemberTypeSummary> {
    return apiClient.post<MemberTypeSummary>("/api/member-types", payload);
  },

  async update(
    id: string,
    payload: UpdateMemberTypeInput,
  ): Promise<MemberTypeSummary> {
    return apiClient.patch<MemberTypeSummary>(
      `/api/member-types/${id}`,
      payload,
    );
  },

  async savePolicy(
    typeId: string,
    policyId: string | null,
    payload: UpsertPolicyInput,
  ): Promise<LoanPolicy> {
    if (policyId) {
      return apiClient.patch<LoanPolicy>(
        `/api/member-types/${typeId}/policies/${policyId}`,
        payload,
      );
    }
    return apiClient.post<LoanPolicy>(
      `/api/member-types/${typeId}/policies`,
      payload,
    );
  },
};
