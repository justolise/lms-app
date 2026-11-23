import { apiClient } from "@/lib/api/client";
import type {
  IdentifierType,
  LoginResponse,
  PasswordResetResponse,
  UserSession,
} from "../types/auth.types";

export const authService = {
  login(
    identifierOrType: string,
    passwordOrIdentifier: string,
    maybePassword?: string,
  ) {
    let type: IdentifierType;
    let identifier: string;
    let password: string;

    if (maybePassword !== undefined) {
      type = identifierOrType as IdentifierType;
      identifier = passwordOrIdentifier;
      password = maybePassword;
    } else {
      identifier = identifierOrType;
      password = passwordOrIdentifier;
      type = identifier.includes("@") ? "EMAIL" : "PHONE";
    }

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

  requestPasswordReset(identifierOrType: string, maybeIdentifier?: string) {
    let type: IdentifierType;
    let identifier: string;

    if (maybeIdentifier !== undefined) {
      type = identifierOrType as IdentifierType;
      identifier = maybeIdentifier;
    } else {
      identifier = identifierOrType;
      type = identifier.includes("@") ? "EMAIL" : "PHONE";
    }

    return apiClient.post<PasswordResetResponse>("/api/auth/forgot-password", {
      type,
      identifier: identifier.trim(),
    });
  },

  resetPassword(
    identifier: string,
    otp: string,
    newPassword: string,
    maybeType?: IdentifierType,
  ) {
    const type = maybeType ?? (identifier.includes("@") ? "EMAIL" : "PHONE");
    return apiClient.post<PasswordResetResponse>("/api/auth/reset-password", {
      type,
      identifier: identifier.trim(),
      code: otp.trim(),
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
