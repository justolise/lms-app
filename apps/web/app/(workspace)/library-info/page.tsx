"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default function LibraryInfoPage() {
  const { user, hasPermission } = useAuth();

  if (!user) return null;

  const hasInfo =
    user.tenantEmail ||
    user.tenantPhone ||
    user.tenantAddress ||
    user.tenantWebsite ||
    user.tenantOpeningHours;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          About This Library
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Contact information, operating hours, and borrowing policies for{" "}
          <strong>{user.tenantName ?? "your library"}</strong>.
        </p>
      </div>

      {/* Library Identity Card */}
      <Card className="overflow-hidden border-border">
        <div className="bg-forest-900 text-white p-6">
          <div className="flex items-center gap-4">
            {user.tenantLogoUrl ? (
              // biome-ignore lint/performance/noImgElement: tenant logo configured by admin
              <img
                src={user.tenantLogoUrl}
                alt={user.tenantName ?? "Library"}
                className="h-16 w-16 rounded-xl object-contain bg-white/10 p-1.5 border border-white/20 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-2xl shrink-0">
                {user.tenantName ? user.tenantName[0].toUpperCase() : "L"}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">
                {user.tenantName ?? "Library"}
              </h2>
              <p className="text-sm text-white/70 mt-0.5">
                Library Management System
              </p>
              {hasPermission(PERMISSIONS.TENANT_PROFILE_MANAGE) && (
                <Link
                  href="/settings"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit library profile
                </Link>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {hasInfo ? (
            <dl className="divide-y divide-border">
              {user.tenantEmail && (
                <div className="flex items-start gap-4 px-6 py-4">
                  <span className="text-xl mt-0.5 shrink-0">✉️</span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Email
                    </dt>
                    <dd className="mt-0.5">
                      <a
                        href={`mailto:${user.tenantEmail}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {user.tenantEmail}
                      </a>
                    </dd>
                  </div>
                </div>
              )}

              {user.tenantPhone && (
                <div className="flex items-start gap-4 px-6 py-4">
                  <span className="text-xl mt-0.5 shrink-0">📞</span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Phone
                    </dt>
                    <dd className="mt-0.5">
                      <a
                        href={`tel:${user.tenantPhone}`}
                        className="text-sm text-foreground hover:text-primary transition-colors"
                      >
                        {user.tenantPhone}
                      </a>
                    </dd>
                  </div>
                </div>
              )}

              {user.tenantAddress && (
                <div className="flex items-start gap-4 px-6 py-4">
                  <span className="text-xl mt-0.5 shrink-0">📍</span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Address
                    </dt>
                    <dd className="mt-0.5 text-sm text-foreground whitespace-pre-line">
                      {user.tenantAddress}
                    </dd>
                  </div>
                </div>
              )}

              {user.tenantWebsite && (
                <div className="flex items-start gap-4 px-6 py-4">
                  <span className="text-xl mt-0.5 shrink-0">🌐</span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Website
                    </dt>
                    <dd className="mt-0.5">
                      <a
                        href={user.tenantWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {user.tenantWebsite}
                      </a>
                    </dd>
                  </div>
                </div>
              )}

              {user.tenantOpeningHours && (
                <div className="flex items-start gap-4 px-6 py-4">
                  <span className="text-xl mt-0.5 shrink-0">🕒</span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Opening Hours
                    </dt>
                    <dd className="mt-0.5">
                      <pre className="text-sm text-foreground font-sans whitespace-pre-line leading-relaxed">
                        {user.tenantOpeningHours}
                      </pre>
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          ) : (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No contact information has been added yet.
              {hasPermission(PERMISSIONS.TENANT_PROFILE_MANAGE) && (
                <Link
                  href="/settings"
                  className="ml-1 text-primary hover:underline font-medium"
                >
                  Add it in Library Profile settings.
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Borrowing Rules */}
      {user.tenantBorrowingRulesSummary && (
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📋</span>
              <h3 className="font-semibold text-foreground">
                Borrowing Policy Summary
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {user.tenantBorrowingRulesSummary}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
