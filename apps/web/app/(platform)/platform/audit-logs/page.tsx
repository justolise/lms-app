"use client";

import { Fragment, useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

interface AuditLogItem {
  id: string;
  source?: "PLATFORM" | "TENANT";
  tenantId?: string | null;
  tenantName?: string | null;
  tenantSlug?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    fullName: string;
    role?: string | null;
  } | null;
}

export default function PlatformAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [_total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "PLATFORM" | "TENANT">(
    "ALL",
  );
  const [tenantIdFilter, setTenantIdFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "50", scope: scopeFilter });
      if (tenantIdFilter.trim()) params.set("tenantId", tenantIdFilter.trim());
      if (actionFilter.trim()) params.set("action", actionFilter.trim());
      if (entityFilter.trim()) params.set("entityType", entityFilter.trim());

      const res = await apiClient.get<{ items: AuditLogItem[]; total: number }>(
        `${ENDPOINTS.platform.auditLogs}?${params.toString()}`,
      );
      setLogs(res?.items || []);
      setTotal(res?.total || 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load audit logs",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Platform Audit Trail
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable, append-only log of platform administrative actions,
            tenant lifecycle, and security events
          </p>
        </div>
        <Button variant="outline" className="text-xs" onClick={loadLogs}>
          Refresh Trail
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 bg-surface p-4 rounded-xl border border-border">
        <div className="w-full sm:w-40">
          <select
            aria-label="Audit scope"
            value={scopeFilter}
            onChange={(e) =>
              setScopeFilter(e.target.value as "ALL" | "PLATFORM" | "TENANT")
            }
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground"
          >
            <option value="ALL">All Activity</option>
            <option value="PLATFORM">Platform Only</option>
            <option value="TENANT">Tenants Only</option>
          </select>
        </div>
        <div className="w-full sm:w-56">
          <Input
            placeholder="Filter by tenant UUID..."
            value={tenantIdFilter}
            onChange={(e) => setTenantIdFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-56">
          <Input
            placeholder="Filter by action (e.g. TENANT_CREATED)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-56">
          <Input
            placeholder="Filter by entity (e.g. TENANT)..."
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          className="text-xs shrink-0"
          onClick={loadLogs}
        >
          Apply Filters
        </Button>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No audit log events match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-hover border-b border-border text-muted-foreground">
                  <th className="p-3 font-semibold">Timestamp</th>
                  <th className="p-3 font-semibold">Scope / Tenant</th>
                  <th className="p-3 font-semibold">Action</th>
                  <th className="p-3 font-semibold">Entity</th>
                  <th className="p-3 font-semibold">Actor</th>
                  <th className="p-3 font-semibold">IP Address</th>
                  <th className="p-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr className="hover:bg-surface-hover/60 transition-colors">
                        <td className="p-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              log.source === "TENANT"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-blue-500/10 text-blue-600"
                            }`}
                          >
                            {log.source || "PLATFORM"}
                          </span>
                          {log.tenantName && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {log.tenantName}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-primary">
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          {log.entityType}{" "}
                          {log.entityId && `(${log.entityId.slice(0, 8)}...)`}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-foreground">
                            {log.actor?.fullName || "System Engine"}
                            {log.actor?.role && (
                              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                                ({log.actor.role})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {log.actor?.email || "internal"}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground text-[11px]">
                          {log.ipAddress || "—"}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : log.id)
                            }
                            className="text-primary hover:underline text-xs cursor-pointer font-medium"
                          >
                            {isExpanded ? "Hide JSON" : "View JSON"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-surface-hover/40 border-b border-border">
                          <td colSpan={7} className="p-3">
                            <pre className="p-3 rounded-lg bg-background border border-border text-[11px] font-mono overflow-x-auto text-foreground">
                              {JSON.stringify(log.metadata || {}, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
