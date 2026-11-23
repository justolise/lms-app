"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { ThemeToggle } from "@/lib/theme/theme-toggle";

interface PlatformUser {
  id: string;
  email: string;
  fullName: string;
  status: string;
}

const PLATFORM_NAV = [
  { href: "/platform", label: "Overview", icon: "📊" },
  { href: "/platform/tenants", label: "Tenants", icon: "🏛️" },
  { href: "/platform/monitoring", label: "Monitoring", icon: "⚡" },
  { href: "/platform/audit-logs", label: "Audit Logs", icon: "📜" },
];

function PlatformLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isLoginPage = pathname === "/platform/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    async function checkAuth() {
      try {
        const user = await apiClient.get<PlatformUser>(ENDPOINTS.platform.me);
        if (user?.id) {
          setCurrentUser(user);
        } else {
          router.replace("/platform/login");
        }
      } catch {
        router.replace("/platform/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [isLoginPage, router]);

  async function handleLogout() {
    try {
      await apiClient.post(ENDPOINTS.platform.logout);
    } catch {
      // Ignore network errors
    } finally {
      setCurrentUser(null);
      router.push("/platform/login");
    }
  }

  // If on login page, render child directly (no shell)
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Platform Super Admin Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/platform" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-900 text-white shadow-xs">
                <span className="text-sm font-bold text-amber-400">CP</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-tight text-foreground">
                    Commonplace
                  </span>
                  <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-500/30">
                    SUPER ADMIN
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground leading-none">
                  SaaS Platform Operations
                </span>
              </div>
            </Link>

            <nav
              className="hidden md:flex items-center gap-1"
              aria-label="Platform navigation"
            >
              {PLATFORM_NAV.map((item) => {
                const isActive =
                  item.href === "/platform"
                    ? pathname === "/platform"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-forest-800 text-white font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {loading ? (
              <div className="h-6 w-20 animate-pulse rounded bg-surface-hover" />
            ) : currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right leading-tight">
                  <span className="text-xs font-semibold text-foreground">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {currentUser.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 hover:border-danger/30 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        <div className="flex md:hidden border-t border-border px-4 py-2 gap-2 overflow-x-auto bg-surface">
          {PLATFORM_NAV.map((item) => {
            const isActive =
              item.href === "/platform"
                ? pathname === "/platform"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
                  isActive
                    ? "bg-forest-800 text-white font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Workspace Body — always renders children so instant navigation segments are never dropped */}
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
      </main>

      <footer className="border-t border-border bg-surface py-4 px-4 text-center text-xs text-muted-foreground">
        Commonplace Platform Operations Workspace &bull; Restricted Access
        &bull; Strict Audit Logged
      </footer>
    </div>
  );
}

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PlatformLayoutInner>{children}</PlatformLayoutInner>
    </Suspense>
  );
}
