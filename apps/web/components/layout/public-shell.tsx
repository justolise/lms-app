"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ComonPlaceLogo } from "@/components/brand/comonplace-logo";
import { useAuth } from "@/lib/auth/auth-context";
import { ThemeToggle } from "@/lib/theme/theme-toggle";

const NAV_LINKS = [
  { href: "/browse", label: "Catalogue" },
  { href: "/about", label: "About" },
  { href: "/features", label: "Features" },
  { href: "/for-schools-libraries", label: "For Schools & Libraries" },
  { href: "/contact", label: "Contact" },
];

const FOOTER_COLUMNS = [
  {
    heading: "Platform",
    links: [
      { href: "/about", label: "About ComonPlace" },
      { href: "/features", label: "Features" },
      { href: "/for-schools-libraries", label: "For Schools & Libraries" },
      { href: "/browse", label: "Browse Catalogue" },
    ],
  },
  {
    heading: "Legal & Privacy",
    links: [
      { href: "/legal/terms-of-service", label: "Terms of Service" },
      { href: "/legal/privacy-policy", label: "Privacy Policy (KDPA)" },
      { href: "/legal/acceptable-use", label: "Acceptable Use" },
      { href: "/legal/cookies", label: "Cookie Policy" },
    ],
  },
  {
    heading: "Policies & Safety",
    links: [
      { href: "/legal/account-access", label: "Account & Access" },
      { href: "/legal/security", label: "Information Security" },
      { href: "/legal/data-retention", label: "Data Retention" },
      { href: "/legal/minor-protection", label: "Child Protection" },
    ],
  },
  {
    heading: "Support",
    links: [
      { href: "/contact", label: "Contact Us" },
      { href: "/legal/sla", label: "Availability SLA" },
      { href: "/request-membership", label: "Membership Enquiry" },
      { href: "/legal", label: "Legal Center" },
    ],
  },
];

const SOCIAL_LINKS = [
  {
    envKey: "NEXT_PUBLIC_SOCIAL_TWITTER",
    label: "Twitter / X",
    icon: (
      <svg
        className="h-4 w-4"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zM17.08 19.77h1.833L7.084 4.126H5.117L17.08 19.77z" />
      </svg>
    ),
  },
  {
    envKey: "NEXT_PUBLIC_SOCIAL_LINKEDIN",
    label: "LinkedIn",
    icon: (
      <svg
        className="h-4 w-4"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    envKey: "NEXT_PUBLIC_SOCIAL_GITHUB",
    label: "GitHub",
    icon: (
      <svg
        className="h-4 w-4"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

export function PublicShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Social links — rendered only when env var is configured
  const activeSocials = SOCIAL_LINKS.filter(
    (s) => typeof process !== "undefined" && process.env[s.envKey],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ── Topbar ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center shrink-0">
              <ComonPlaceLogo
                variant="primary"
                size="md"
                subtitle="Knowledge. Community. Opportunity."
              />
            </Link>

            {/* Desktop nav */}
            <nav
              className="hidden lg:flex items-center gap-5 text-sm font-medium"
              aria-label="Main navigation"
            >
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {user ? (
              <div className="hidden sm:flex items-center gap-2">
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
                  <span className="hidden sm:inline">
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
                className="hidden sm:inline-flex rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              className="lg:hidden flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-surface-hover transition-colors"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <nav
            className="lg:hidden border-t border-border bg-surface px-4 py-4 space-y-1"
            aria-label="Mobile navigation"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-border mt-2">
              {user ? (
                <div className="flex flex-col gap-2 pt-1">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
                  >
                    Go to Workspace
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="block w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* ── Page content ─────────────────────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-forest-900 bg-forest-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Five-column grid: brand + 4 link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {/* Brand column */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-1">
              <Link href="/" className="inline-flex items-center mb-4">
                <ComonPlaceLogo variant="light" size="sm" />
              </Link>
              <p className="text-xs text-gold-200 font-medium mb-1.5">
                Knowledge. Community. Opportunity.
              </p>
              <p className="text-xs text-white/75 leading-relaxed max-w-52">
                A shared digital home for schools, educational institutions, and
                community libraries.
              </p>
              {/* Social icons — hidden when not configured */}
              {activeSocials.length > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  {activeSocials.map((s) => (
                    <a
                      key={s.envKey}
                      href={process.env[s.envKey] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="text-white/75 hover:text-gold-400 transition-colors"
                    >
                      {s.icon}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Link columns */}
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-400 mb-3">
                  {col.heading}
                </h3>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-xs text-white/80 hover:text-gold-200 transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-10 border-t border-white/15 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/75">
              © {currentYear ?? 2026} ComonPlace. All rights reserved.
            </p>
            <p className="text-xs text-gold-200/90">
              Knowledge. Community. Opportunity.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
