import { apiClient } from "@/lib/api/client";
import type {
  CreateMemberInput,
  CreateMemberResult,
  MemberTypeOption,
} from "../types/members.types";

export const membersService = {
  async create(payload: CreateMemberInput): Promise<CreateMemberResult> {
    return apiClient.post<CreateMemberResult>("/api/members", payload);
  },

  async listMemberTypes(): Promise<MemberTypeOption[]> {
    const data = await apiClient.get<MemberTypeOption[]>("/api/members/types");
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
