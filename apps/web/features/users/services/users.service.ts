import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
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

    return apiClient.get<DirectoryResponse>(
      `${ENDPOINTS.users.list}?${params.toString()}`,
    );
  },

  async inviteLibrarian(
    payload: InviteLibrarianInput,
  ): Promise<InviteLibrarianResult> {
    return apiClient.post<InviteLibrarianResult>(
      ENDPOINTS.users.librarians,
      payload,
    );
  },

  async promoteUser(userId: string): Promise<void> {
    await apiClient.post(ENDPOINTS.users.promote(userId), {});
  },

  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>(ENDPOINTS.profile.get);
  },

  async updateProfile(payload: UpdateProfileInput): Promise<UserProfile> {
    return apiClient.patch<UserProfile>(ENDPOINTS.profile.update, payload);
  },

  async deactivateAccount(): Promise<void> {
    await apiClient.delete(ENDPOINTS.profile.delete);
  },
};
