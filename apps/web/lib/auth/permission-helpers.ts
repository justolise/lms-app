import type { AuthRole } from "@/types/roles";
import type { Permission } from "./permissions.ts";
import { ROLE_PERMISSIONS } from "./role-permissions.ts";

export function hasPermission(
  role: AuthRole | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

export function hasAnyPermission(
  role: AuthRole | null | undefined,
  permissions: Permission[],
): boolean {
  if (!role) return false;
  return permissions.some((perm) => hasPermission(role, perm));
}

export function hasAllPermissions(
  role: AuthRole | null | undefined,
  permissions: Permission[],
): boolean {
  if (!role) return false;
  return permissions.every((perm) => hasPermission(role, perm));
}
