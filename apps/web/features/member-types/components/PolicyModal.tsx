"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { ITEM_FORMATS } from "@/features/catalogue/types/catalogue.types";
import { memberTypesService } from "../services/member-types.service";
import type { LoanPolicy } from "../types/member-types.types";

interface PolicyModalProps {
  memberTypeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingPolicy?: LoanPolicy | null;
}

export function PolicyModal({
  memberTypeId,
  isOpen,
  onClose,
  onSuccess,
  editingPolicy,
}: PolicyModalProps) {
  const [format, setFormat] = useState("BOOK");
  const [duration, setDuration] = useState(14);
  const [maxLoans, setMaxLoans] = useState(5);
  const [maxRenewals, setMaxRenewals] = useState(2);
  const [gracePeriod, setGracePeriod] = useState(0);
  const [dailyFine, setDailyFine] = useState(0);
  const [maxFine, setMaxFine] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingPolicy) {
      setFormat(editingPolicy.itemFormat);
      setDuration(editingPolicy.loanDurationDays);
      setMaxLoans(editingPolicy.maxConcurrentLoans);
      setMaxRenewals(editingPolicy.maxRenewals);
      setGracePeriod(editingPolicy.gracePeriodDays);
      setDailyFine(editingPolicy.dailyFineMinorUnits);
      setMaxFine(editingPolicy.maxFineMinorUnits);
    } else {
      setFormat("BOOK");
      setDuration(14);
      setMaxLoans(5);
      setMaxRenewals(2);
      setGracePeriod(0);
      setDailyFine(0);
      setMaxFine(0);
    }
    setError(null);
  }, [editingPolicy, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await memberTypesService.savePolicy(
        memberTypeId,
        editingPolicy ? editingPolicy.id : null,
        {
          itemFormat: editingPolicy ? undefined : format,
          loanDurationDays: Number(duration),
          maxConcurrentLoans: Number(maxLoans),
          maxRenewals: Number(maxRenewals),
          gracePeriodDays: Number(gracePeriod),
          dailyFineMinorUnits: Number(dailyFine),
          maxFineMinorUnits: Number(maxFine),
        },
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save policy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingPolicy
          ? `Edit Policy: ${editingPolicy.itemFormat}`
          : "Add Loan Policy"
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {!editingPolicy && (
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Item Format *
            </label>
            <Select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              options={ITEM_FORMATS.map((f) => ({ value: f, label: f }))}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Loan Duration (days)
            </label>
            <Input
              type="number"
              min="1"
              required
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Max Concurrent Loans
            </label>
            <Input
              type="number"
              min="1"
              required
              value={maxLoans}
              onChange={(e) => setMaxLoans(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Max Renewals
            </label>
            <Input
              type="number"
              min="0"
              required
              value={maxRenewals}
              onChange={(e) => setMaxRenewals(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Grace Period (days)
            </label>
            <Input
              type="number"
              min="0"
              required
              value={gracePeriod}
              onChange={(e) => setGracePeriod(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Daily Fine (KES minor units, e.g. 500 = KES 5.00)
            </label>
            <Input
              type="number"
              min="0"
              required
              value={dailyFine}
              onChange={(e) => setDailyFine(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Max Fine (KES minor units)
            </label>
            <Input
              type="number"
              min="0"
              required
              value={maxFine}
              onChange={(e) => setMaxFine(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Save Policy
          </Button>
        </div>
      </form>
    </Modal>
  );
}
