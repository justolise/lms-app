"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";
import { ThemeToggle } from "@/lib/theme/theme-toggle";

export function MoreMenuDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user, role, logout } = useAuth();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="More navigation options"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs lg:hidden animate-in fade-in duration-150"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 rounded-t-2xl border-t border-border bg-surface p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

        {/* User Card */}
        {user && (
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-800 text-white font-bold text-sm">
                {user.fullName ? user.fullName[0].toUpperCase() : "U"}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {user.fullName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.email || user.phone || ""}
                </p>
              </div>
            </div>
            <Badge variant="primary">{role || "MEMBER"}</Badge>
          </div>
        )}

        {/* Links */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1">
            Library Operations
          </p>
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            Dashboard
          </Link>
          <Link
            href="/fines"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            Fines & Waivers Desk
          </Link>
          <Link
            href="/categories"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            Categories Tree
          </Link>
          <Link
            href="/member-types"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            Member Types & Policies
          </Link>
          <Link
            href="/users"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            Staff Directory
          </Link>

          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 pt-4">
            Preferences & Account
          </p>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium text-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            Profile & Active Sessions
          </Link>
          <Link
            href="/change-password"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            Security Settings
          </Link>
        </div>

        {/* Logout */}
        <div className="pt-4 mt-4 border-t border-border">
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger/20 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
