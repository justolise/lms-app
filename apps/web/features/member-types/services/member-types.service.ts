import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
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
    const data = await apiClient.get<MemberTypeSummary[]>(
      ENDPOINTS.memberTypes.list,
    );
    return Array.isArray(data) ? data : [];
  },

  async getById(id: string): Promise<MemberTypeDetail> {
    return apiClient.get<MemberTypeDetail>(ENDPOINTS.memberTypes.get(id));
  },

  async create(payload: CreateMemberTypeInput): Promise<MemberTypeSummary> {
    return apiClient.post<MemberTypeSummary>(
      ENDPOINTS.memberTypes.create,
      payload,
    );
  },

  async update(
    id: string,
    payload: UpdateMemberTypeInput,
  ): Promise<MemberTypeSummary> {
    return apiClient.patch<MemberTypeSummary>(
      ENDPOINTS.memberTypes.update(id),
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
        ENDPOINTS.memberTypes.policy(typeId, policyId),
        payload,
      );
    }
    return apiClient.post<LoanPolicy>(
      ENDPOINTS.memberTypes.policies(typeId),
      payload,
    );
  },
};
