"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { ThemeToggle } from "@/lib/theme/theme-toggle";

export function PublicShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Public Topbar */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-800 text-white shadow-xs">
              <svg
                className="h-5 w-5 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground">
                Commonplace
              </span>
              <span className="text-[10px] text-muted-foreground leading-none">
                Library System
              </span>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-4 text-sm font-medium">
            <Link
              href="/browse"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Catalogue
            </Link>
            <Link
              href="/request-membership"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Request Membership
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors"
              >
                Workspace
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover transition-colors"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-800 text-white font-bold text-[10px]">
                  {user.fullName ? user.fullName[0].toUpperCase() : "U"}
                </div>
                <span className="hidden sm:inline font-medium">
                  {user.fullName.split(" ")[0]}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 hover:border-danger/30 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
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

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Public Footer */}
      <footer className="border-t border-border bg-surface py-6 px-4 text-center text-xs text-muted-foreground sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Commonplace Library System. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/browse" className="hover:underline">
              Catalogue
            </Link>
            <Link href="/request-membership" className="hover:underline">
              Membership Enquiry
            </Link>
            <Link href="/login" className="hover:underline">
              Staff & Patron Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
