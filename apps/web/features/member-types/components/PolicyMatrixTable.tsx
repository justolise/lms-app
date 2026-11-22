"use client";

import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatKes } from "@/utils/currency";
import type { LoanPolicy, MemberTypeDetail } from "../types/member-types.types";

interface PolicyMatrixTableProps {
  detail: MemberTypeDetail | null;
  loading: boolean;
  onEditPolicy: (policy: LoanPolicy) => void;
  onAddPolicy: () => void;
}

export function PolicyMatrixTable({
  detail,
  loading,
  onEditPolicy,
  onAddPolicy,
}: PolicyMatrixTableProps) {
  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
        <Spinner size="md" />
        <span className="text-sm text-muted-foreground">
          Loading loan policies...
        </span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground bg-surface rounded-xl border border-border">
        Select a member type to view and configure its loan policies.
      </div>
    );
  }

  const policies = detail.policies || [];

  return (
    <div className="bg-surface rounded-xl border border-border p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">
            Circulation Policies: {detail.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            Defines borrow durations, checkout limits, grace periods, and fine
            rates by format.
          </p>
        </div>
        <Can permission={PERMISSIONS.LOAN_POLICIES_MANAGE}>
          <Button size="sm" onClick={onAddPolicy}>
            + Add Policy
          </Button>
        </Can>
      </div>

      {policies.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
          No policies configured for this member type.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-raised border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Format</th>
                <th className="px-3 py-2 font-semibold">Duration</th>
                <th className="px-3 py-2 font-semibold">Max Loans</th>
                <th className="px-3 py-2 font-semibold">Max Renewals</th>
                <th className="px-3 py-2 font-semibold">Grace Period</th>
                <th className="px-3 py-2 font-semibold">Daily Fine</th>
                <th className="px-3 py-2 font-semibold">Max Fine</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {policies.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-surface-raised/50 transition-colors"
                >
                  <td className="px-3 py-2.5 font-bold text-foreground">
                    {p.itemFormat}
                  </td>
                  <td className="px-3 py-2.5">{p.loanDurationDays} days</td>
                  <td className="px-3 py-2.5">{p.maxConcurrentLoans} items</td>
                  <td className="px-3 py-2.5">{p.maxRenewals}x</td>
                  <td className="px-3 py-2.5">{p.gracePeriodDays} days</td>
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    {formatKes(p.dailyFineMinorUnits)}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatKes(p.maxFineMinorUnits)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Can permission={PERMISSIONS.LOAN_POLICIES_MANAGE}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditPolicy(p)}
                      >
                        Edit
                      </Button>
                    </Can>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
