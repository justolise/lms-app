"use client";

import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/utils/date";
import { circulationService } from "../services/circulation.service";
import type { Loan } from "../types/circulation.types";
import { BarcodeScanner } from "./BarcodeScanner";

export function CheckoutDesk() {
  const [memberIdentifier, setMemberIdentifier] = useState("");
  const [barcode, setBarcode] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Loan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode || !memberIdentifier) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const loan = await circulationService.checkout({
        barcode,
        memberIdentifier,
        overrideReason: overrideReason || undefined,
      });
      setResult(loan);
      setBarcode("");
      setOverrideReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Checkout Desk</h2>
        <p className="text-sm text-muted-foreground">
          Issue a book copy to a registered library member.
        </p>
      </div>

      <form onSubmit={handleCheckout} className="space-y-4">
        <Input
          label="Member Identifier"
          required
          placeholder="Admission number, email, or user UUID"
          value={memberIdentifier}
          onChange={(e) => setMemberIdentifier(e.target.value)}
          helperText="e.g. ADM-2024-001 or student@school.ac.ke"
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Copy Barcode
          </label>
          <BarcodeScanner
            onDetected={(code) => setBarcode(code)}
            label="Scan Book Barcode"
          />
          {barcode && (
            <p className="text-xs font-mono bg-success/10 text-success border border-success/20 rounded px-2.5 py-1">
              Selected Barcode: {barcode}
            </p>
          )}
        </div>

        <Input
          label="Librarian Override Reason (Optional)"
          placeholder="e.g. Approved by Head Librarian for exam week"
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
          helperText="Required only if bypassing a soft block (fines, suspension, or expired membership)"
        />

        {error && <Alert variant="error">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={!barcode || !memberIdentifier}
          isLoading={loading}
        >
          Complete Checkout
        </Button>
      </form>

      {result && (
        <Alert variant="success" title="Checkout Successful!">
          <div className="space-y-1 mt-1 text-xs">
            <p>
              Due Date:{" "}
              <strong className="text-sm">
                {formatDate(result.dueAt, true)}
              </strong>
            </p>
            <p>
              Loan Period: {result.loanDurationDays} days · Max renewals:{" "}
              {result.maxRenewals}
            </p>
            <p className="font-mono text-muted-foreground">
              Loan ID: {result.id}
            </p>
          </div>
        </Alert>
      )}
    </div>
  );
}
