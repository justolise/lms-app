"use client";

import type { ReactNode } from "react";
import { AccessDenied } from "@/components/feedback/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth/auth-context";
import type { Permission } from "@/lib/auth/permissions";

export function RequirePermission({
  permission,
  children,
  fallback,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { role, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!hasPermission(permission)) {
    return fallback ? (
      fallback
    ) : (
      <AccessDenied requiredRole={role ?? undefined} />
    );
  }

  return children as React.ReactElement;
}
