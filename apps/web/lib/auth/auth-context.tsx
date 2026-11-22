"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiClient } from "@/lib/api/client";
import type { AuthRole } from "@/types/roles";
import { hasPermission as checkPermission } from "./permission-helpers";
import type { Permission } from "./permissions";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: AuthRole;
  status: string;
  tenantId: string;
  tenantName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  role: AuthRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await apiClient.get<AuthUser>("/api/profile");
      if (data?.id) {
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      return checkPermission(user?.role, permission);
    },
    [user?.role],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      // Ignore network errors during logout
    } finally {
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isLoading,
        isAuthenticated: Boolean(user),
        hasPermission,
        refreshProfile: fetchProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
