"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { formatKes } from "@/utils/currency";
import { formatDate } from "@/utils/date";
import { circulationService } from "../services/circulation.service";
import type { Loan } from "../types/circulation.types";

interface LoansLedgerProps {
  userId?: string;
  title?: string;
  description?: string;
}

export function LoansLedger({
  userId,
  title = "Loans Ledger",
  description = "Track circulation history, due dates, renewal counts, and fine status.",
}: LoansLedgerProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLoans() {
    setLoading(true);
    setError(null);
    try {
      const data = await circulationService.listLoans(
        statusFilter || undefined,
        userId,
      );
      setLoans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load loans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLoans();
  }, [statusFilter, userId]);

  return (
    <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="w-full sm:w-44">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "", label: "All Statuses" },
              { value: "ACTIVE", label: "Active Loans" },
              { value: "RETURNED", label: "Returned Loans" },
              { value: "LOST", label: "Lost Items (CIR-9)" },
              { value: "DAMAGED", label: "Damaged Items (CIR-9)" },
            ]}
          />
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="py-12 flex justify-center">
          <Spinner size="md" />
        </div>
      ) : loans.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
          No loan records found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-raised border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Copy Barcode</th>
                <th className="px-3 py-2.5 font-semibold">Issued Date</th>
                <th className="px-3 py-2.5 font-semibold">Due Date</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Renewals</th>
                <th className="px-3 py-2.5 font-semibold text-right">Fine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loans.map((loan) => {
                const isOverdue =
                  loan.status === "ACTIVE" && new Date(loan.dueAt) < new Date();

                return (
                  <tr
                    key={loan.id}
                    className="hover:bg-surface-raised/50 transition-colors"
                  >
                    <td className="px-3 py-3 font-mono font-bold text-foreground">
                      {loan.copyId ? loan.copyId.slice(0, 13) : "Copy"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatDate(loan.checkedOutAt)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          isOverdue
                            ? "font-bold text-danger"
                            : "text-foreground"
                        }
                      >
                        {formatDate(loan.dueAt)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant={
                          loan.status === "RETURNED"
                            ? "muted"
                            : loan.status === "LOST"
                              ? "danger"
                              : loan.status === "DAMAGED"
                                ? "warning"
                                : isOverdue
                                  ? "danger"
                                  : "success"
                        }
                      >
                        {isOverdue ? "OVERDUE" : loan.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {loan.renewalCount} / {loan.maxRenewals}
                    </td>
                    <td className="px-3 py-3 text-right font-medium">
                      {loan.fineMinorUnits && loan.fineMinorUnits > 0 ? (
                        <span className="text-danger">
                          {formatKes(loan.fineMinorUnits)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">KES 0.00</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
