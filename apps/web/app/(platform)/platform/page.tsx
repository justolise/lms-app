"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

interface MonitoringStats {
  tenants: {
    total: number;
    active: number;
    suspended: number;
  };
  global: {
    totalUsers: number;
    totalTitles: number;
    totalCopies: number;
    activeLoans: number;
  };
  system: {
    database: "up" | "down";
    redis: "up" | "down";
    uptimeSeconds: number;
  };
  timestamp: string;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor: {
    email: string;
    fullName: string;
  } | null;
}

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statsData, logsData] = await Promise.all([
          apiClient.get<MonitoringStats>(ENDPOINTS.platform.monitoringStats),
          apiClient.get<{ items: AuditLog[] }>(
            `${ENDPOINTS.platform.auditLogs}?scope=ALL&limit=5`,
          ),
        ]);
        setStats(statsData);
        setRecentLogs(logsData?.items || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load platform stats",
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${seconds % 60}s`;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Platform Operations Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Global multi-tenant metrics, infrastructure health &amp; tenant
            lifecycle overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/platform/tenants?onboard=true">
            <Button variant="primary" className="text-xs">
              + Onboard New Tenant
            </Button>
          </Link>
          <Link href="/platform/monitoring">
            <Button variant="outline" className="text-xs">
              Live Monitoring
            </Button>
          </Link>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* System Status Banner */}
      {stats && (
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                PostgreSQL DB:
              </span>
              {stats.system.database === "up" ? (
                <Badge variant="success" className="text-[10px]">
                  UP
                </Badge>
              ) : (
                <Badge variant="danger" className="text-[10px]">
                  DOWN
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                Redis Cache:
              </span>
              {stats.system.redis === "up" ? (
                <Badge variant="success" className="text-[10px]">
                  UP
                </Badge>
              ) : (
                <Badge variant="danger" className="text-[10px]">
                  DOWN
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">API Uptime:</span>
              <span className="font-mono text-muted-foreground">
                {formatUptime(stats.system.uptimeSeconds)}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Last checked: {new Date(stats.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          ["stat-sk-1", "stat-sk-2", "stat-sk-3", "stat-sk-4"].map((skId) => (
            <Card key={skId}>
              <CardContent className="p-5 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Tenants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats?.tenants.total ?? 0}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="text-emerald-600 font-semibold">
                    {stats?.tenants.active ?? 0} active
                  </span>
                  <span>&bull;</span>
                  <span className="text-amber-600 font-semibold">
                    {stats?.tenants.suspended ?? 0} suspended
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Loans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {stats?.global.activeLoans ?? 0}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Circulating books across all branches
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Physical Inventory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats?.global.totalCopies ?? 0}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Total copies across {stats?.global.totalTitles ?? 0} titles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Registered Patrons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats?.global.totalUsers ?? 0}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Active students, teachers &amp; community
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Links & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Audit Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              Recent Platform Events
            </h2>
            <Link
              href="/platform/audit-logs"
              className="text-xs text-primary font-medium hover:underline"
            >
              View Full Audit Trail &rarr;
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No platform audit events logged yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-primary">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {log.entityType} ({log.entityId || "global"})
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Actor:{" "}
                        {log.actor?.fullName || log.actor?.email || "System"}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Operations Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-foreground">
            Operational Actions
          </h2>
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <Link
              href="/platform/tenants"
              className="block p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-surface-hover transition-colors"
            >
              <div className="font-semibold text-xs text-foreground mb-0.5">
                🏛️ Tenant Directory &amp; Status
              </div>
              <p className="text-[11px] text-muted-foreground">
                Provision new school or community libraries, configure slugs
                &amp; manage activation state.
              </p>
            </Link>

            <Link
              href="/platform/monitoring"
              className="block p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-surface-hover transition-colors"
            >
              <div className="font-semibold text-xs text-foreground mb-0.5">
                ⚡ Infrastructure Monitoring
              </div>
              <p className="text-[11px] text-muted-foreground">
                Inspect database connection pool health, Redis cluster state
                &amp; response latency.
              </p>
            </Link>

            <Link
              href="/platform/audit-logs"
              className="block p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-surface-hover transition-colors"
            >
              <div className="font-semibold text-xs text-foreground mb-0.5">
                📜 Platform Audit Logs
              </div>
              <p className="text-[11px] text-muted-foreground">
                Inspect append-only log of tenant creation, administrator
                assignments &amp; security events.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
