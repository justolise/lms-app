"use client";

import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cancelHold } from "../services/holds.service";
import type { Hold } from "../types/holds.types";

interface HoldsQueueTableProps {
  holds: Hold[];
  loading: boolean;
  error: string | null;
  onHoldCancelled: (holdId: string) => void;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING: "bg-info/15 text-info border border-info/25",
    READY: "bg-success/15 text-success border border-success/25",
    FULFILLED: "bg-muted/30 text-muted-foreground border border-border",
    CANCELLED: "bg-danger/15 text-danger border border-danger/25",
    EXPIRED: "bg-warning/15 text-warning border border-warning/25",
  };
  return (
    map[status] ?? "bg-muted/20 text-muted-foreground border border-border"
  );
}

function pickupCountdown(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

export function HoldsQueueTable({
  holds,
  loading,
  error,
  onHoldCancelled,
}: HoldsQueueTableProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel(holdId: string) {
    if (!confirm("Cancel this hold reservation?")) return;
    setCancellingId(holdId);
    setCancelError(null);
    try {
      await cancelHold(holdId, { reason: "Staff cancellation" });
      onHoldCancelled(holdId);
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Failed to cancel hold",
      );
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (cancelError) {
    return <Alert variant="error">{cancelError}</Alert>;
  }

  if (holds.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
        No holds in the queue.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-raised text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Patron</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Placed</th>
            <th className="px-4 py-3">Pickup window</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {holds.map((hold, idx) => {
            const countdown = pickupCountdown(hold.expiresAt);
            const canCancel =
              hold.status === "PENDING" || hold.status === "READY";
            return (
              <tr
                key={hold.id}
                className="bg-surface hover:bg-surface-raised transition-colors"
              >
                <td className="px-4 py-3 font-mono text-muted-foreground">
                  {idx + 1}
                </td>
                <td className="px-4 py-3 font-medium text-foreground max-w-50 truncate">
                  {hold.bookTitle ?? hold.catalogueItemId}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div>{hold.userFullName}</div>
                  {hold.userEmail && (
                    <div className="text-xs text-muted-foreground/70">
                      {hold.userEmail}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(hold.status)}`}
                  >
                    {hold.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(hold.placedAt).toLocaleDateString("en-KE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {hold.status === "READY" && countdown ? (
                    <span
                      className={
                        countdown === "Expired"
                          ? "text-danger font-medium"
                          : "text-success font-medium"
                      }
                    >
                      {countdown}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {canCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={cancellingId === hold.id}
                      isLoading={cancellingId === hold.id}
                      onClick={() => handleCancel(hold.id)}
                      className="text-danger hover:text-danger"
                    >
                      Cancel
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
