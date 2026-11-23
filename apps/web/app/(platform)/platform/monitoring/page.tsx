"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function PlatformMonitoringPage() {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function loadMetrics() {
    try {
      const data = await apiClient.get<MonitoringStats>(
        ENDPOINTS.platform.monitoringStats,
      );
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(loadMetrics, 10000); // 10s polling
    return () => clearInterval(interval);
  }, [autoRefresh]);

  function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Platform Monitoring &amp; Telemetry
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time infrastructure health, database connectivity, and
            aggregate volume metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            Auto-refresh (10s)
          </label>
          <Button
            variant="outline"
            className="text-xs"
            onClick={loadMetrics}
            isLoading={loading}
          >
            Refresh Now
          </Button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Infrastructure Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              PostgreSQL Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Connection State
              </span>
              {stats?.system.database === "up" ? (
                <Badge variant="success">HEALTHY (UP)</Badge>
              ) : (
                <Badge variant="danger">UNREACHABLE (DOWN)</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Primary multi-tenant relational store with Row-Level Security
              isolation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Redis In-Memory Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Connection State
              </span>
              {stats?.system.redis === "up" ? (
                <Badge variant="success">HEALTHY (UP)</Badge>
              ) : (
                <Badge variant="danger">UNREACHABLE (DOWN)</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Distributed rate-limiter, session blacklist, and identity cache.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              API Process Runtime
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Process Uptime
              </span>
              <span className="font-mono text-xs font-bold text-foreground">
                {stats ? formatUptime(stats.system.uptimeSeconds) : "—"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              NestJS monolithic API container running under Linux sandbox.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Aggregate Platform Volume Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">
          Global Multi-Tenant Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <span className="text-[11px] text-muted-foreground font-medium">
              Active Tenants
            </span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {stats?.tenants.active ?? 0}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {stats?.tenants.suspended ?? 0} suspended
            </span>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <span className="text-[11px] text-muted-foreground font-medium">
              Registered Patrons
            </span>
            <p className="text-2xl font-bold text-foreground mt-1">
              {stats?.global.totalUsers ?? 0}
            </p>
            <span className="text-[10px] text-muted-foreground">
              Across all libraries
            </span>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <span className="text-[11px] text-muted-foreground font-medium">
              Circulating Titles
            </span>
            <p className="text-2xl font-bold text-foreground mt-1">
              {stats?.global.totalTitles ?? 0}
            </p>
            <span className="text-[10px] text-muted-foreground">
              Bibliographic records
            </span>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <span className="text-[11px] text-muted-foreground font-medium">
              Active Loans
            </span>
            <p className="text-2xl font-bold text-primary mt-1">
              {stats?.global.activeLoans ?? 0}
            </p>
            <span className="text-[10px] text-muted-foreground">
              Currently checked out
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
