"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { PERMISSIONS } from "@/lib/auth/permissions";

interface DashboardStats {
  activeLoansCount: number;
  overdueLoansCount: number;
  activeHoldsCount: number;
  totalCatalogueTitles: number;
}

export default function DashboardPage() {
  const { user, role, hasPermission } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeLoansCount: 0,
    overdueLoansCount: 0,
    activeHoldsCount: 0,
    totalCatalogueTitles: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch active loans and holds counts
        const loans = await apiClient
          .get<any[]>("/api/circulation/loans?status=ACTIVE")
          .catch(() => []);
        const overdue = await apiClient
          .get<any[]>("/api/circulation/loans?status=OVERDUE")
          .catch(() => []);
        const holds = await apiClient.get<any[]>("/api/holds").catch(() => []);
        const catalogue = await apiClient
          .get<any[]>("/api/catalogue")
          .catch(() => []);

        setStats({
          activeLoansCount: Array.isArray(loans) ? loans.length : 0,
          overdueLoansCount: Array.isArray(overdue) ? overdue.length : 0,
          activeHoldsCount: Array.isArray(holds) ? holds.length : 0,
          totalCatalogueTitles: Array.isArray(catalogue) ? catalogue.length : 0,
        });
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-forest-800 to-forest-700 p-6 sm:p-8 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-forest-900/50 px-3 py-1 text-xs font-semibold text-amber-400 mb-2">
              <span>{role || "STAFF"} DESK</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.fullName || "Librarian"}
            </h1>
            <p className="mt-1 text-sm text-forest-100 max-w-xl">
              Commonplace Library System workspace. Manage circulation, titles,
              patron memberships, and loan policies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPermission(PERMISSIONS.CIRCULATION_CHECKOUT) && (
              <Link href="/circulation">
                <Button
                  size="md"
                  className="bg-amber-500 hover:bg-amber-600 text-forest-900 font-semibold border-none"
                >
                  Circulation Desk
                </Button>
              </Link>
            )}
            {hasPermission(PERMISSIONS.CATALOGUE_CREATE) && (
              <Link href="/catalogue">
                <Button
                  size="md"
                  variant="outline"
                  className="text-white border-forest-500 hover:bg-forest-600/50"
                >
                  New Book Entry
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Loans
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {loading ? "..." : stats.activeLoansCount}
              </h3>
              <span className="text-xs text-muted-foreground mt-0.5 inline-block">
                Currently checked out
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-50 dark:bg-forest-900/40 text-primary">
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Overdue Loans
              </p>
              <h3 className="text-2xl font-bold text-danger mt-1">
                {loading ? "..." : stats.overdueLoansCount}
              </h3>
              <span className="text-xs text-muted-foreground mt-0.5 inline-block">
                Requiring follow-up
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger">
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
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Holds in Queue
              </p>
              <h3 className="text-2xl font-bold text-amber-500 mt-1">
                {loading ? "..." : stats.activeHoldsCount}
              </h3>
              <span className="text-xs text-muted-foreground mt-0.5 inline-block">
                Waiting on copy return
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
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
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Catalogue Titles
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {loading ? "..." : stats.totalCatalogueTitles}
              </h3>
              <span className="text-xs text-muted-foreground mt-0.5 inline-block">
                Active catalogued works
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-50 dark:bg-forest-900/40 text-primary">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Circulation Shortcuts</CardTitle>
            <CardDescription>
              Rapid desk actions for high-frequency circulation tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/circulation"
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <svg
                    className="h-5 w-5"
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
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Checkout &amp; Return Desks
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Scan patron and book barcodes for issue or return
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-primary">&rarr;</span>
            </Link>

            <Link
              href="/holds"
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <svg
                    className="h-5 w-5"
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
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Holds Queue &amp; Shelf
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Review awaiting holds and manage ready-for-pickup shelf
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-primary">&rarr;</span>
            </Link>

            <Link
              href="/fines"
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger/10 text-danger">
                  <svg
                    className="h-5 w-5"
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
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Fines &amp; Payments
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Record M-Pesa/Cash payments and process fee waivers
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-primary">&rarr;</span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patrons &amp; Inventory</CardTitle>
            <CardDescription>
              Patron registry and collection management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/members"
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 dark:bg-forest-900/50 text-primary">
                  <svg
                    className="h-5 w-5"
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
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Patron Directory
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Register new patrons and view borrowing standing
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-primary">&rarr;</span>
            </Link>

            <Link
              href="/catalogue"
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 dark:bg-forest-900/50 text-primary">
                  <svg
                    className="h-5 w-5"
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
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Catalogue &amp; Copies
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Add titles, print barcode labels, and audit copy conditions
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-primary">&rarr;</span>
            </Link>

            <Link
              href="/member-types"
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 dark:bg-forest-900/50 text-primary">
                  <svg
                    className="h-5 w-5"
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
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Loan Policies Matrix
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Configure borrowing limits, loan periods, and fine rates
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-primary">&rarr;</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
