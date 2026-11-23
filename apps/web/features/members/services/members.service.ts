import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
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
    return apiClient.post<CreateMemberResult>(ENDPOINTS.members.create, payload);
  },

  async listMemberTypes(): Promise<MemberTypeOption[]> {
    const data = await apiClient.get<MemberTypeOption[]>(ENDPOINTS.members.types);
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
      qs ? `${ENDPOINTS.members.list}?${qs}` : ENDPOINTS.members.list,
    );
    return Array.isArray(data) ? data : [];
  },

  async getMember(id: string): Promise<MemberDetail> {
    return apiClient.get<MemberDetail>(ENDPOINTS.members.get(id));
  },

  async updateMember(
    id: string,
    payload: UpdateMemberPayload,
  ): Promise<MemberDetail> {
    return apiClient.patch<MemberDetail>(ENDPOINTS.members.update(id), payload);
  },

  async getBorrowingHistory(id: string): Promise<MemberLoanItem[]> {
    const data = await apiClient.get<MemberLoanItem[]>(
      ENDPOINTS.members.loans(id),
    );
    return Array.isArray(data) ? data : [];
  },

  async listEnquiries(status?: string): Promise<any[]> {
    const qs = status ? `?status=${status}` : "";
    const data = await apiClient.get<any[]>(`${ENDPOINTS.members.enquiries}${qs}`);
    return Array.isArray(data) ? data : [];
  },

  async reviewEnquiry(
    id: string,
    status: "REVIEWED" | "APPROVED" | "REJECTED" = "REVIEWED",
  ): Promise<any> {
    return apiClient.patch(ENDPOINTS.members.reviewEnquiry(id), { status });
  },
};
