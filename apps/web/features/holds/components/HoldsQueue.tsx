"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { HoldsQueueTable } from "@/features/holds/components/HoldsQueueTable";
import { listHolds } from "@/features/holds/services/holds.service";
import type { Hold } from "@/features/holds/types/holds.types";

export function HoldsQueue() {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  async function loadHolds() {
    setLoading(true);
    setError(null);
    try {
      const data = await listHolds({
        status: statusFilter || undefined,
      });
      setHolds(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load holds queue",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHolds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function handleHoldCancelled(holdId: string) {
    setHolds((prev) => prev.filter((h) => h.id !== holdId));
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Holds Queue</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Patron reservations waiting in FIFO order. READY holds have an
            assigned copy awaiting collection.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadHolds}>
          Refresh
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {["", "PENDING", "READY", "FULFILLED", "CANCELLED"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {s === "" ? "All" : s}
          </button>
        ))}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <HoldsQueueTable
        holds={holds}
        loading={loading}
        error={null}
        onHoldCancelled={handleHoldCancelled}
      />
    </div>
  );
}
