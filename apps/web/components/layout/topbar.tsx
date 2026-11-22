"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";

const TITLE_MAP: Record<string, string> = {
  "/dashboard": "Operational Dashboard",
  "/circulation": "Circulation Desk",
  "/catalogue": "Catalogue Management",
  "/holds": "Holds & Reservations",
  "/members": "Members Directory",
  "/fines": "Fines & Waivers Desk",
  "/categories": "Subject Categories Tree",
  "/member-types": "Member Types & Policies",
  "/users": "Staff Directory",
  "/settings": "Library Profile & Settings",
  "/profile": "Personal Profile",
  "/change-password": "Change Password",
};

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname();
  const { user, role } = useAuth();

  // Derive desk title
  let currentTitle = "Workspace";
  for (const [route, title] of Object.entries(TITLE_MAP)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      currentTitle = title;
      break;
    }
  }

  const libraryName = user?.tenantName ?? "Library Workspace";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur-md lg:px-6">
      {/* Left: Mobile Drawer Trigger + Breadcrumb */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Open navigation menu"
            className="flex p-2 text-muted-foreground hover:text-foreground lg:hidden rounded-lg hover:bg-surface-hover cursor-pointer"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}

        <div className="flex flex-col">
          <h1 className="text-base font-semibold text-foreground tracking-tight sm:text-lg">
            {currentTitle}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate max-w-32">{libraryName}</span>
            <span>/</span>
            <span className="text-primary font-medium">{currentTitle}</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Global Search Hint */}
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span>Search catalogue...</span>
          <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        {/* Profile & Logout Controls */}
        {user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg p-1.5 text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-800 text-white font-bold text-xs shadow-xs">
                {user.fullName ? user.fullName[0].toUpperCase() : "U"}
              </div>
              <span className="hidden md:inline-block max-w-30 truncate text-foreground font-medium">
                {user.fullName}
              </span>
              <Badge
                variant="primary"
                className="text-[10px] hidden sm:inline-flex"
              >
                {role || "MEMBER"}
              </Badge>
            </Link>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
