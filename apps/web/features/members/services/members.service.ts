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
};
