"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { POLICIES } from "./policies-data";

function LegalLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="bg-background min-h-screen">
      {/* Draft Disclaimer Header */}
      <aside
        aria-label="Draft policy notice"
        className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-3 text-xs sm:text-sm text-center font-medium"
      >
        <span className="font-bold tracking-wide uppercase mr-2 text-amber-700 dark:text-amber-400">
          [DRAFT — SUBJECT TO PRODUCT OWNER &amp; LEGAL COUNSEL REVIEW]
        </span>
        These policy documents govern the Commonplace v1.0 SaaS Platform under
        the Laws of Kenya and KDPA 2019.
      </aside>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Policy Navigation Sidebar */}
          <nav
            aria-label="Platform legal policies"
            className="lg:col-span-1 space-y-2"
          >
            <div className="p-4 rounded-xl border border-border bg-surface">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Platform Legal Center
              </h2>
              <ul className="space-y-1">
                {POLICIES.map((p) => {
                  const isActive = pathname === p.href;
                  return (
                    <li key={p.code}>
                      <Link
                        href={p.href}
                        className={`block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-forest-800 text-white font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{p.title}</span>
                          <span
                            className={`text-[10px] ml-1.5 shrink-0 ${isActive ? "text-amber-300" : "text-muted-foreground/60"}`}
                          >
                            {p.code}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 pt-4 border-t border-border text-[11px] text-muted-foreground space-y-1">
                <p>
                  <span className="font-semibold text-foreground">
                    Jurisdiction:
                  </span>{" "}
                  Kenya
                </p>
                <p>
                  <span className="font-semibold text-foreground">
                    Framework:
                  </span>{" "}
                  KDPA 2019
                </p>
                <p>
                  <span className="font-semibold text-foreground">
                    Version:
                  </span>{" "}
                  1.0 (Nov 2026)
                </p>
              </div>
            </div>
          </nav>

          {/* Policy Document Body */}
          <main className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-10 shadow-xs">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LegalLayoutInner>{children}</LegalLayoutInner>
    </Suspense>
  );
}
