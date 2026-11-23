import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  LibraryProfile,
  UpdateLibraryProfileInput,
} from "../types/library-profile.types";

export const adminService = {
  async getProfile(): Promise<LibraryProfile> {
    return apiClient.get<LibraryProfile>(ENDPOINTS.admin.profile);
  },

  async updateProfile(
    payload: UpdateLibraryProfileInput,
  ): Promise<LibraryProfile> {
    return apiClient.patch<LibraryProfile>(ENDPOINTS.admin.profile, payload);
  },
};
