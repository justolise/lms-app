import { apiClient } from "@/lib/api/client";
import type {
  CreateMemberInput,
  CreateMemberResult,
  MemberDetail,
  MemberDirectoryItem,
  MemberLoanItem,
  MemberTypeOption,
  UpdateMemberPayload,
} from "../types/members.types";

export const membersService = {
  async create(payload: CreateMemberInput): Promise<CreateMemberResult> {
    return apiClient.post<CreateMemberResult>("/api/members", payload);
  },

  async listMemberTypes(): Promise<MemberTypeOption[]> {
    const data = await apiClient.get<MemberTypeOption[]>("/api/members/types");
    return Array.isArray(data) ? data : [];
  },

  async listMembers(params?: {
    search?: string;
    memberTypeId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<MemberDirectoryItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.memberTypeId)
      searchParams.set("memberTypeId", params.memberTypeId);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));

    const qs = searchParams.toString();
    const data = await apiClient.get<MemberDirectoryItem[]>(
      `/api/members${qs ? `?${qs}` : ""}`,
    );
    return Array.isArray(data) ? data : [];
  },

  async getMember(id: string): Promise<MemberDetail> {
    return apiClient.get<MemberDetail>(`/api/members/${id}`);
  },

  async updateMember(
    id: string,
    payload: UpdateMemberPayload,
  ): Promise<MemberDetail> {
    return apiClient.patch<MemberDetail>(`/api/members/${id}`, payload);
  },

  async getBorrowingHistory(id: string): Promise<MemberLoanItem[]> {
    const data = await apiClient.get<MemberLoanItem[]>(
      `/api/members/${id}/loans`,
    );
    return Array.isArray(data) ? data : [];
  },

  async listEnquiries(status?: string): Promise<any[]> {
    const query = status ? `?status=${status}` : "";
    const data = await apiClient.get<any[]>(`/api/members/enquiries${query}`);
    return Array.isArray(data) ? data : [];
  },

  async reviewEnquiry(
    id: string,
    status: "REVIEWED" | "APPROVED" | "REJECTED" = "REVIEWED",
  ): Promise<any> {
    return apiClient.patch(`/api/members/enquiries/${id}/review`, { status });
  },
};
