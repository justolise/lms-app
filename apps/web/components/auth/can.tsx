"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  hasAllPermissions,
  hasAnyPermission,
} from "@/lib/auth/permission-helpers";
import type { Permission } from "@/lib/auth/permissions";

export interface CanProps {
  permission?: Permission;
  any?: Permission[];
  all?: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Declarative component-level permission gate.
 * Completely hides the enclosed children if the authenticated user lacks the required permission(s).
 */
export function Can({
  permission,
  any,
  all,
  children,
  fallback = null,
}: CanProps) {
  const { role } = useAuth();

  if (permission && !role) return <>{fallback}</>;

  if (permission) {
    const allowed = hasAnyPermission(role, [permission]);
    return allowed
      ? (children as React.ReactElement)
      : (fallback as React.ReactElement | null);
  }

  if (any && any.length > 0) {
    const allowed = hasAnyPermission(role, any);
    return allowed
      ? (children as React.ReactElement)
      : (fallback as React.ReactElement | null);
  }

  if (all && all.length > 0) {
    const allowed = hasAllPermissions(role, all);
    return allowed
      ? (children as React.ReactElement)
      : (fallback as React.ReactElement | null);
  }

  return <>{children}</>;
}
