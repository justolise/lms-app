"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cancelHold, listHolds } from "../services/holds.service";
import type { Hold } from "../types/holds.types";

function pickupCountdown(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m remaining to collect`;
  return `${mins}m remaining to collect`;
}

export function MyHoldsList() {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function loadHolds() {
    setLoading(true);
    setError(null);
    try {
      const data = await listHolds();
      setHolds(
        data.filter((h) => h.status === "PENDING" || h.status === "READY"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load holds");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHolds();
  }, []);

  async function handleCancel(holdId: string) {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;
    setCancellingId(holdId);
    try {
      await cancelHold(holdId, { reason: "Member cancellation" });
      setHolds((prev) => prev.filter((h) => h.id !== holdId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel hold");
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-4">
          My Reservations
        </h2>
        <div className="flex items-center justify-center py-6">
          <Spinner size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">My Reservations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Books you've reserved in the waiting queue.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadHolds}>
          Refresh
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {holds.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          You have no active reservations.
        </div>
      ) : (
        <div className="space-y-3">
          {holds.map((hold, idx) => {
            const countdown = pickupCountdown(hold.expiresAt);
            const isReady = hold.status === "READY";
            return (
              <div
                key={hold.id}
                className={`rounded-lg border p-4 flex items-start justify-between gap-4 ${
                  isReady
                    ? "border-success/40 bg-success/5"
                    : "border-border bg-surface-raised"
                }`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isReady
                          ? "bg-success/15 text-success"
                          : "bg-info/15 text-info"
                      }`}
                    >
                      {isReady ? "✓ Ready for Pickup" : `Queue #${idx + 1}`}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground text-sm truncate">
                    {hold.bookTitle ?? "Title unavailable"}
                  </p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                      Reserved:{" "}
                      {new Date(hold.placedAt).toLocaleDateString("en-KE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {isReady && countdown && (
                      <p
                        className={
                          countdown === "Expired"
                            ? "text-danger font-medium"
                            : "text-success font-medium"
                        }
                      >
                        ⏱ {countdown}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={cancellingId === hold.id}
                  isLoading={cancellingId === hold.id}
                  onClick={() => handleCancel(hold.id)}
                  className="text-danger hover:text-danger shrink-0"
                >
                  Cancel
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
