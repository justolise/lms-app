import { apiClient } from "@/lib/api/client";
import type {
  DirectoryResponse,
  InviteLibrarianInput,
  InviteLibrarianResult,
  UpdateProfileInput,
  UserProfile,
} from "../types/users.types";

export const usersService = {
  async getDirectory(
    page = 1,
    limit = 15,
    search?: string,
  ): Promise<DirectoryResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search?.trim()) {
      params.set("search", search.trim());
    }

    return apiClient.get<DirectoryResponse>(`/api/users?${params.toString()}`);
  },

  async inviteLibrarian(
    payload: InviteLibrarianInput,
  ): Promise<InviteLibrarianResult> {
    return apiClient.post<InviteLibrarianResult>(
      "/api/users/librarians",
      payload,
    );
  },

  async promoteUser(userId: string): Promise<void> {
    await apiClient.post(`/api/users/${userId}/promote`, {});
  },

  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>("/api/profile");
  },

  async updateProfile(payload: UpdateProfileInput): Promise<UserProfile> {
    return apiClient.patch<UserProfile>("/api/profile", payload);
  },

  async deactivateAccount(): Promise<void> {
    await apiClient.delete("/api/profile");
  },
};
