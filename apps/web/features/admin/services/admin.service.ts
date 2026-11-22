import { apiClient } from "@/lib/api/client";
import type {
  LibraryProfile,
  UpdateLibraryProfileInput,
} from "../types/library-profile.types";

export const adminService = {
  async getProfile(): Promise<LibraryProfile> {
    return apiClient.get<LibraryProfile>("/api/admin/profile");
  },

  async updateProfile(
    payload: UpdateLibraryProfileInput,
  ): Promise<LibraryProfile> {
    return apiClient.patch<LibraryProfile>("/api/admin/profile", payload);
  },
};
