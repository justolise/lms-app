"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/utils/date";
import { circulationService } from "../services/circulation.service";
import type { Loan } from "../types/circulation.types";

export function RenewDesk() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [fetching, setFetching] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [result, setResult] = useState<Loan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadActiveLoans() {
    setFetching(true);
    setError(null);
    try {
      const data = await circulationService.getActiveLoans();
      setLoans(Array.isArray(data) ? data : []);
      if (data && data.length > 0) {
        setSelectedLoanId(data[0].id);
      }
    } catch {
      setError("Failed to load active loans");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    loadActiveLoans();
  }, []);

  async function handleRenew(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLoanId) return;

    setRenewing(true);
    setResult(null);
    setError(null);

    try {
      const updated = await circulationService.renew(selectedLoanId);
      setResult(updated);
      setLoans((prev) =>
        prev.map((l) => (l.id === selectedLoanId ? updated : l)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Renewal failed");
    } finally {
      setRenewing(false);
    }
  }

  const selectedLoan = loans.find((l) => l.id === selectedLoanId);
  const isMaxRenewalsReached =
    selectedLoan && selectedLoan.renewalCount >= selectedLoan.maxRenewals;

  return (
    <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Renew Loan</h2>
        <p className="text-sm text-muted-foreground">
          Extend borrowing period for an active loan within permitted policy
          limits.
        </p>
      </div>

      {fetching ? (
        <div className="flex justify-center p-8">
          <Spinner size="md" />
        </div>
      ) : loans.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No active loans currently eligible for renewal.
        </p>
      ) : (
        <form onSubmit={handleRenew} className="space-y-4">
          <Select
            label="Select Active Loan"
            value={selectedLoanId}
            onChange={(e) => setSelectedLoanId(e.target.value)}
            options={loans.map((l) => ({
              value: l.id,
              label: `Loan #${l.id.slice(0, 8)} · Due: ${formatDate(l.dueAt)} (Renewals: ${l.renewalCount}/${l.maxRenewals})`,
            }))}
          />

          {isMaxRenewalsReached && (
            <Alert variant="warning" title="Renewal Blocked">
              This loan has already reached the maximum allowed renewals (
              {selectedLoan.maxRenewals}).
            </Alert>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={!selectedLoanId || isMaxRenewalsReached}
            isLoading={renewing}
          >
            Renew Loan
          </Button>
        </form>
      )}

      {result && (
        <Alert variant="success" title="Loan Renewed Successfully!">
          <div className="space-y-1 mt-1 text-xs">
            <p>
              New Due Date: <strong>{formatDate(result.dueAt, true)}</strong>
            </p>
            <p>
              Renewals used: {result.renewalCount} / {result.maxRenewals}
            </p>
          </div>
        </Alert>
      )}
    </div>
  );
}
