"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComonPlaceLogo } from "@/components/brand/comonplace-logo";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";
import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import { cn } from "@/utils/classnames";

interface NavEntry {
  label: string;
  href: string;
  permission?: Permission;
  icon: (props: { className?: string }) => React.ReactNode;
}

const DESK_NAV_ITEMS: NavEntry[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: "Circulation Desk",
    href: "/circulation",
    permission: PERMISSIONS.CIRCULATION_CHECKOUT,
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
  },
  {
    label: "Catalogue",
    href: "/catalogue",
    permission: PERMISSIONS.CATALOGUE_READ,
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
  },
  {
    label: "Holds & Reservations",
    href: "/holds",
    permission: PERMISSIONS.HOLDS_READ_ALL,
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
    ),
  },
  {
    label: "Members Directory",
    href: "/members",
    permission: PERMISSIONS.MEMBERS_READ,
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    label: "Fines & Waivers",
    href: "/fines",
    permission: PERMISSIONS.CIRCULATION_OVERRIDE,
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    label: "About Library",
    href: "/library-info",
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

const ADMIN_NAV_ITEMS: NavEntry[] = [
  {
    label: "Categories Tree",
    href: "/categories",
    permission: PERMISSIONS.CATEGORIES_READ,
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h7"
        />
      </svg>
    ),
  },
  {
    label: "Member Types & Policies",
    href: "/member-types",
    permission: PERMISSIONS.MEMBER_TYPES_READ,
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    label: "Staff Directory",
    href: "/users",
    permission: PERMISSIONS.USERS_DIRECTORY_READ,
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    label: "Library Profile",
    href: "/settings",
    permission: PERMISSIONS.TENANT_PROFILE_MANAGE,
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
  },
];

export function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
}: {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { user, role, hasPermission, logout } = useAuth();

  const filterVisible = (items: NavEntry[]) =>
    items.filter((item) => {
      if (!item.permission) return true;
      return hasPermission(item.permission);
    });

  const visibleDesks = filterVisible(DESK_NAV_ITEMS);
  const visibleAdmin = filterVisible(ADMIN_NAV_ITEMS);

  // Helper to format tenant-scoped workspace URLs
  const getWorkspaceHref = (path: string) => {
    if (user?.tenantSlug) {
      return `/libraries/${user.tenantSlug}/workspace${path}`;
    }
    return path;
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-dvh sticky top-0 shrink-0 border-r border-border bg-surface transition-all duration-300 z-30 select-none",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-border">
        <Link
          href={getWorkspaceHref("/dashboard")}
          className="flex items-center gap-3 overflow-hidden"
        >
          {/* Library logo or fallback emblem */}
          {user?.tenantLogoUrl ? (
            // biome-ignore lint/performance/noImgElement: tenant logo configured by admin
            <img
              src={user.tenantLogoUrl}
              alt={user.tenantName ?? "Library"}
              className="h-10 w-10 shrink-0 rounded-xl object-contain bg-forest-800 p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <ComonPlaceLogo variant="mark" size="md" />
          )}
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-bold tracking-tight text-foreground line-clamp-1">
                {user?.tenantName ?? "Library"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                ComonPlace Workspace
              </span>
            </div>
          )}
        </Link>
        {/* Library info shortcut */}
        {!isCollapsed && (
          <Link
            href={getWorkspaceHref("/library-info")}
            title="About this library"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-primary transition-colors shrink-0"
          >
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </Link>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex p-1.5 rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground cursor-pointer"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isCollapsed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Desks Section */}
        <div>
          {!isCollapsed && (
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Operations
            </p>
          )}
          <nav className="space-y-1">
            {visibleDesks.map((item) => {
              const targetHref = getWorkspaceHref(item.href);
              const isActive =
                pathname === targetHref ||
                pathname === item.href ||
                pathname.startsWith(`${targetHref}/`) ||
                pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={targetHref}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors group relative",
                    isActive
                      ? "bg-forest-50 dark:bg-forest-900/40 text-forest-800 dark:text-forest-100 font-semibold"
                      : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                    isCollapsed && "justify-center px-0",
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-amber-500" />
                  )}
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive
                        ? "text-primary dark:text-forest-100"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Administration Section */}
        {visibleAdmin.length > 0 && (
          <div>
            {!isCollapsed && (
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Administration
              </p>
            )}
            <nav className="space-y-1">
              {visibleAdmin.map((item) => {
                const targetHref = getWorkspaceHref(item.href);
                const isActive =
                  pathname === targetHref ||
                  pathname === item.href ||
                  pathname.startsWith(`${targetHref}/`) ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={targetHref}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors group relative",
                      isActive
                        ? "bg-forest-50 dark:bg-forest-900/40 text-forest-800 dark:text-forest-100 font-semibold"
                        : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                      isCollapsed && "justify-center px-0",
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-amber-500" />
                    )}
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isActive
                          ? "text-primary dark:text-forest-100"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Brand + Help Footer */}
      <div
        className={cn(
          "border-t border-border px-3 py-3 shrink-0",
          isCollapsed ? "flex flex-col items-center gap-2" : "space-y-2",
        )}
      >
        {/* Help / Support button */}
        <a
          href="mailto:support@comonplace.app"
          title="Help & Support"
          className={cn(
            "flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors",
            isCollapsed && "justify-center px-0",
          )}
        >
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {!isCollapsed && <span>Help &amp; Support</span>}
        </a>

        {/* ComonPlace brand mark */}
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-forest-50 dark:bg-forest-900/20">
            <ComonPlaceLogo variant="mark" size="sm" />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-forest-800 dark:text-forest-200 tracking-tight">
                ComonPlace
              </span>
              <span className="text-[10px] text-muted-foreground leading-none">
                Knowledge. Community.
              </span>
            </div>
          </div>
        ) : (
          <ComonPlaceLogo variant="mark" size="sm" />
        )}
      </div>

      {/* Footer Profile & Logout */}
      <div className="border-t border-border p-3 shrink-0 space-y-2">
        {user ? (
          <>
            <Link
              href={getWorkspaceHref("/profile")}
              title="View profile and settings"
              className={cn(
                "flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-hover overflow-hidden w-full",
                isCollapsed && "justify-center p-0",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-100 dark:bg-forest-900 text-primary font-bold text-xs">
                {user.fullName ? user.fullName[0].toUpperCase() : "U"}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col truncate flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">
                    {user.fullName}
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="primary"
                      className="text-[10px] py-0 px-1.5"
                    >
                      {role || "MEMBER"}
                    </Badge>
                  </div>
                  {user.tenantName && (
                    <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {user.tenantName}
                    </span>
                  )}
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={() => logout()}
              title="Sign Out"
              className={cn(
                "flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-xs font-semibold text-danger hover:bg-danger/10 hover:text-danger transition-colors cursor-pointer border border-transparent hover:border-danger/20",
                isCollapsed && "justify-center px-0",
              )}
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg bg-primary/10 p-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors",
              isCollapsed && "px-0 text-[10px]",
            )}
          >
            <span>{isCollapsed ? "Sign In" : "Sign In to Portal"}</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
