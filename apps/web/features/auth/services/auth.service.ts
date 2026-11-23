import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
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

    return apiClient.post<LoginResponse>(ENDPOINTS.auth.login, {
      type,
      identifier: identifier.trim(),
      password,
    });
  },

  selectMembership(tenantId: string) {
    return apiClient.post<LoginResponse>(ENDPOINTS.auth.selectMembership, {
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

    return apiClient.post<PasswordResetResponse>(ENDPOINTS.auth.forgotPassword, {
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
    return apiClient.post<PasswordResetResponse>(ENDPOINTS.auth.resetPassword, {
      type,
      identifier: identifier.trim(),
      code: otp.trim(),
      newPassword,
    });
  },

  changePassword(newPassword: string, currentPassword?: string) {
    return apiClient.post<{ success: boolean; message: string }>(
      ENDPOINTS.auth.changePassword,
      {
        newPassword,
        ...(currentPassword ? { currentPassword } : {}),
      },
    );
  },

  async listSessions(): Promise<UserSession[]> {
    const data = await apiClient.get<UserSession[]>(ENDPOINTS.auth.sessions);
    return Array.isArray(data) ? data : [];
  },

  async revokeSession(sessionId: string): Promise<{ revoked: boolean }> {
    return apiClient.delete<{ revoked: boolean }>(
      ENDPOINTS.auth.session(sessionId),
    );
  },
};
