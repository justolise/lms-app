import { apiClient } from "@/lib/api/client";
import type {
  IdentifierType,
  LoginResponse,
  PasswordResetResponse,
  UserSession,
} from "../types/auth.types";

export const authService = {
  login(type: IdentifierType, identifier: string, password: string) {
    return apiClient.post<LoginResponse>("/api/auth/login", {
      type,
      identifier: identifier.trim(),
      password,
    });
  },

  selectMembership(tenantId: string) {
    return apiClient.post<LoginResponse>("/api/auth/select-membership", {
      tenantId,
    });
  },

  requestPasswordReset(type: IdentifierType, identifier: string) {
    return apiClient.post<PasswordResetResponse>("/api/auth/forgot-password", {
      type,
      identifier: identifier.trim(),
    });
  },

  resetPassword(identifier: string, otp: string, newPassword: string) {
    return apiClient.post<PasswordResetResponse>("/api/auth/reset-password", {
      identifier: identifier.trim(),
      otp: otp.trim(),
      newPassword,
    });
  },

  changePassword(newPassword: string, currentPassword?: string) {
    return apiClient.post<{ success: boolean; message: string }>(
      "/api/auth/change-password",
      {
        newPassword,
        ...(currentPassword ? { currentPassword } : {}),
      },
    );
  },

  async listSessions(): Promise<UserSession[]> {
    const data = await apiClient.get<UserSession[]>("/api/auth/sessions");
    return Array.isArray(data) ? data : [];
  },

  async revokeSession(sessionId: string): Promise<{ revoked: boolean }> {
    return apiClient.delete<{ revoked: boolean }>(
      `/api/auth/sessions/${sessionId}`,
    );
  },
};
