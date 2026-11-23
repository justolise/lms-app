"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { LoansLedger } from "@/features/circulation/components/LoansLedger";
import { MyHoldsList } from "@/features/holds/components/MyHoldsList";
import { reportsService } from "@/features/reports/services/reports.service";
import type {
  DashboardReportResponse,
  DashboardStats,
  PopularTitleItem,
  RecentActivityItem,
} from "@/features/reports/types/reports.types";
import { useAuth } from "@/lib/auth/auth-context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatKes } from "@/utils/currency";
import { formatDate } from "@/utils/date";

const initialStats: DashboardStats = {
  activeLoansCount: 0,
  overdueLoansCount: 0,
  activeHoldsCount: 0,
  totalCatalogueTitles: 0,
  totalCopiesCount: 0,
  availableCopiesCount: 0,
  newMembersThisMonth: 0,
  outstandingFinesMinorUnits: 0,
  collectedMonthMinorUnits: 0,
  outstandingFinesKes: 0,
  collectedFinesThisMonthKes: 0,
};

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { user, role, isLoading: authLoading, hasPermission } = useAuth();
  const isStaff = role === "ADMIN" || role === "LIBRARIAN";

  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [popularTitles, setPopularTitles] = useState<PopularTitleItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    // Patrons (MEMBER, TEACHER, PARENT) do not have permission for staff KPI reports
    if (!isStaff) {
      setLoading(false);
      return;
    }

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const data: DashboardReportResponse =
          await reportsService.getDashboard();
        setStats(data.stats);
        setPopularTitles(data.popularTitles || []);
        setRecentActivity(data.recentActivity || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard metrics",
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [authLoading, isStaff]);

  if (authLoading) {
    return (
      <div className="py-24 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Patron / Member view
  if (!isStaff) {
    return (
      <div className="space-y-6">
        {/* Welcome Banner for Patrons */}
        <div className="rounded-2xl bg-linear-to-r from-forest-800 to-forest-700 p-6 sm:p-8 text-white shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-forest-900/50 px-3 py-1 text-xs font-semibold text-amber-400 mb-2">
                <span>{role || "MEMBER"} PORTAL</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.fullName || "Member"}
              </h1>
              <p className="mt-1 text-sm text-forest-100 max-w-xl">
                {user?.tenantName
                  ? `${user.tenantName} — browse books, manage your loans, and check reservation status.`
                  : "Browse books, manage your loans, and check reservation status."}
              </p>
              {(user?.tenantOpeningHours ||
                user?.tenantPhone ||
                user?.tenantEmail) && (
                <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs text-forest-100">
                  {user.tenantOpeningHours && (
                    <span className="inline-flex items-center gap-1.5 bg-forest-900/40 px-2.5 py-1 rounded-md border border-forest-600/40">
                      <span>🕒</span>
                      <span className="line-clamp-1">
                        {user.tenantOpeningHours.split("\n")[0]}
                      </span>
                    </span>
                  )}
                  {user.tenantPhone && (
                    <span className="inline-flex items-center gap-1.5 bg-forest-900/40 px-2.5 py-1 rounded-md border border-forest-600/40">
                      <span>📞</span>
                      <span>{user.tenantPhone}</span>
                    </span>
                  )}
                  {user.tenantEmail && (
                    <span className="inline-flex items-center gap-1.5 bg-forest-900/40 px-2.5 py-1 rounded-md border border-forest-600/40">
                      <span>✉️</span>
                      <span>{user.tenantEmail}</span>
                    </span>
                  )}
                  <Link
                    href="/library-info"
                    className="text-amber-300 hover:text-amber-200 font-semibold underline underline-offset-2 inline-flex items-center gap-1 ml-1"
                  >
                    View library details &rarr;
                  </Link>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/catalogue">
                <Button
                  size="md"
                  className="bg-amber-500 hover:bg-amber-600 text-forest-900 font-semibold border-none"
                >
                  Browse Catalogue
                </Button>
              </Link>
              <Link href="/library-info">
                <Button
                  size="md"
                  variant="outline"
                  className="text-white border-forest-500 hover:bg-forest-600/50"
                >
                  About Library
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Patron Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/catalogue" className="block group">
            <Card className="h-full transition-shadow hover:shadow-md border-border group-hover:border-primary/40">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-forest-50 dark:bg-forest-900/40 text-primary">
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
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    Library Catalogue
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Search titles, check availability, and place holds
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/profile" className="block group">
            <Card className="h-full transition-shadow hover:shadow-md border-border group-hover:border-primary/40">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
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
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    My Active Holds
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    View queued reservations &amp; collection status
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/library-info" className="block group">
            <Card className="h-full transition-shadow hover:shadow-md border-border group-hover:border-primary/40">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-forest-50 dark:bg-forest-900/40 text-primary">
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    About This Library
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Operating hours, contacts, and borrowing policy
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Patron's Loans Ledger */}
        <div className="space-y-2">
          <LoansLedger
            userId={user?.id}
            title="My Borrowed Books"
            description="All active and past book loans issued to your account."
          />
        </div>

        {/* Patron's Active Holds */}
        <div className="space-y-2">
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                My Active Reservations
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your held items and monitor pickup notifications.
              </p>
            </div>
            <MyHoldsList />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-linear-to-r from-forest-800 to-forest-700 p-6 sm:p-8 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-forest-900/50 px-3 py-1 text-xs font-semibold text-amber-400 mb-2">
              <span>{role || "STAFF"} DESK</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.fullName || "Librarian"}
            </h1>
            <p className="mt-1 text-sm text-forest-100 max-w-xl">
              {user?.tenantName
                ? `${user.tenantName} — manage circulation, titles, patron memberships, and loan policies.`
                : "Manage circulation, titles, patron memberships, and loan policies."}
            </p>
            {(user?.tenantOpeningHours ||
              user?.tenantPhone ||
              user?.tenantEmail) && (
              <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs text-forest-100">
                {user.tenantOpeningHours && (
                  <span className="inline-flex items-center gap-1.5 bg-forest-900/40 px-2.5 py-1 rounded-md border border-forest-600/40">
                    <span>🕒</span>
                    <span className="line-clamp-1">
                      {user.tenantOpeningHours.split("\n")[0]}
                    </span>
                  </span>
                )}
                {user.tenantPhone && (
                  <span className="inline-flex items-center gap-1.5 bg-forest-900/40 px-2.5 py-1 rounded-md border border-forest-600/40">
                    <span>📞</span>
                    <span>{user.tenantPhone}</span>
                  </span>
                )}
                {user.tenantEmail && (
                  <span className="inline-flex items-center gap-1.5 bg-forest-900/40 px-2.5 py-1 rounded-md border border-forest-600/40">
                    <span>✉️</span>
                    <span>{user.tenantEmail}</span>
                  </span>
                )}
                <Link
                  href="/library-info"
                  className="text-amber-300 hover:text-amber-200 font-semibold underline underline-offset-2 inline-flex items-center gap-1 ml-1"
                >
                  View library details &rarr;
                </Link>
              </div>
            )}
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

      {error && (
        <Alert variant="warning" title="Analytics Subsystem Offline">
          Live statistics could not be retrieved ({error}). Circulation desk,
          physical inventory, holds, and patron management remain fully
          operational.
        </Alert>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Active Loans */}
        <Link href="/circulation" className="block group">
          <Card className="h-full transition-shadow hover:shadow-md border-border group-hover:border-primary/40">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Loans
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-50 dark:bg-forest-900/40 text-primary">
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
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-bold text-foreground">
                  {loading ? "..." : stats.activeLoansCount}
                </h3>
                <span className="text-xs text-muted-foreground mt-0.5 inline-block">
                  Checked out
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Overdue Loans */}
        <Link href="/circulation" className="block group">
          <Card
            className={`h-full transition-shadow hover:shadow-md border-border ${
              stats.overdueLoansCount > 0
                ? "border-danger/30 bg-danger/5"
                : "group-hover:border-primary/40"
            }`}
          >
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Overdue
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger">
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
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <h3
                  className={`text-2xl font-bold ${
                    stats.overdueLoansCount > 0
                      ? "text-danger"
                      : "text-foreground"
                  }`}
                >
                  {loading ? "..." : stats.overdueLoansCount}
                </h3>
                <span className="text-xs text-muted-foreground mt-0.5 inline-block">
                  Needs return
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Holds in Queue */}
        <Link href="/holds" className="block group">
          <Card className="h-full transition-shadow hover:shadow-md border-border group-hover:border-primary/40">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Holds Queue
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
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
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-bold text-foreground">
                  {loading ? "..." : stats.activeHoldsCount}
                </h3>
                <span className="text-xs text-muted-foreground mt-0.5 inline-block">
                  Waiting on copies
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Titles & Copies Inventory */}
        <Link href="/catalogue" className="block group">
          <Card className="h-full transition-shadow hover:shadow-md border-border group-hover:border-primary/40">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Collection
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-50 dark:bg-forest-900/40 text-primary">
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-bold text-foreground">
                  {loading ? "..." : stats.totalCatalogueTitles}
                </h3>
                <span className="text-xs text-muted-foreground mt-0.5 inline-block">
                  {loading
                    ? "..."
                    : `${stats.availableCopiesCount}/${stats.totalCopiesCount} available`}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* New Members This Month */}
        <Link href="/members" className="block group">
          <Card className="h-full transition-shadow hover:shadow-md border-border group-hover:border-primary/40">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  New Patrons
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-50 dark:bg-forest-900/40 text-primary">
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-bold text-foreground">
                  {loading ? "..." : stats.newMembersThisMonth}
                </h3>
                <span className="text-xs text-muted-foreground mt-0.5 inline-block">
                  This month
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Fines Ledger */}
        <Link href="/fines" className="block group">
          <Card className="h-full transition-shadow hover:shadow-md border-border group-hover:border-primary/40">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fines Ledger
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-sm font-bold text-foreground">
                  {loading ? "..." : formatKes(stats.collectedMonthMinorUnits)}
                </h3>
                <span className="text-[11px] text-muted-foreground mt-0.5 inline-block">
                  {loading
                    ? "..."
                    : `Unpaid: ${formatKes(stats.outstandingFinesMinorUnits)}`}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Middle Section: Popular Titles & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Titles (Top Borrowed Works) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Popular Titles</CardTitle>
                <CardDescription>
                  Most checked-out books and resources in this library
                </CardDescription>
              </div>
              <Badge variant="primary" className="text-xs">
                Top 5
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : popularTitles.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No borrowing activity recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {popularTitles.map((book, idx) => (
                  <div
                    key={book.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-surface-raised flex items-center justify-center font-bold text-muted-foreground text-[11px]">
                        {idx + 1}
                      </span>
                      {book.coverUrl ? (
                        // biome-ignore lint/performance/noImgElement: dynamic external cover URL
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-8 h-10 object-cover rounded shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-10 rounded bg-forest-50 dark:bg-forest-900/40 flex items-center justify-center text-primary shrink-0">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="truncate">
                        <Link
                          href={`/catalogue?search=${encodeURIComponent(book.title)}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors truncate block"
                        >
                          {book.title}
                        </Link>
                        <p className="text-muted-foreground text-[11px] truncate">
                          {book.author || "Unknown author"} · {book.format}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="default"
                        className="text-[11px] font-medium"
                      >
                        {book.borrowCount}{" "}
                        {book.borrowCount === 1 ? "loan" : "loans"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Circulation Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest checkouts and returns across the circulation desks
                </CardDescription>
              </div>
              <Link href="/circulation">
                <Button size="sm" variant="outline" className="text-xs">
                  Desk &rarr;
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No recent transactions recorded.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          item.type === "RETURN"
                            ? "bg-forest-50 dark:bg-forest-900/40 text-primary"
                            : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        {item.type === "RETURN" ? (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-foreground truncate">
                          {item.description}
                        </p>
                        <p className="text-muted-foreground text-[11px] truncate">
                          Patron: {item.patronName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(item.timestamp, true)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
