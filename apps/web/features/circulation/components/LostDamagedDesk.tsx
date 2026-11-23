"use client";

import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatKes } from "@/utils/currency";
import { circulationService } from "../services/circulation.service";
import type { MarkLostDamagedResult } from "../types/circulation.types";
import { BarcodeScanner } from "./BarcodeScanner";

const QUICK_REASONS = {
  LOST: [
    "Lost - Reported by patron",
    "Unreturned after overdue notices",
    "Lost in transit / missing from shelf",
    "Lost in school dormitory",
  ],
  DAMAGED: [
    "Severe liquid / water damage",
    "Torn or missing pages",
    "Broken spine / cover detached",
    "Heavy markings / graffiti",
  ],
};

interface LostDamagedDeskProps {
  initialBarcode?: string;
  initialLoanId?: string;
  onSuccess?: () => void;
}

export function LostDamagedDesk({
  initialBarcode = "",
  initialLoanId,
  onSuccess,
}: LostDamagedDeskProps) {
  const [barcode, setBarcode] = useState(initialBarcode);
  const [status, setStatus] = useState<"LOST" | "DAMAGED">("LOST");
  const [reason, setReason] = useState("");
  const [feeKes, setFeeKes] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarkLostDamagedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode.trim() && !initialLoanId) {
      setError("Please provide a copy barcode or select an active loan.");
      return;
    }

    if (!reason.trim()) {
      setError("A reason is mandatory when reporting a copy lost or damaged.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const parsedKes = Number.parseFloat(feeKes) || 0;
    const feeMinorUnits = Math.round(Math.max(0, parsedKes) * 100);

    try {
      const res = await circulationService.markLostDamaged({
        barcode: barcode.trim() || undefined,
        loanId: initialLoanId,
        status,
        reason: reason.trim(),
        feeMinorUnits,
      });

      setResult(res);
      setReason("");
      setFeeKes("0");
      if (!initialBarcode) setBarcode("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">
          Lost & Damaged Processing (CIR-9)
        </h2>
        <p className="text-sm text-muted-foreground">
          Mark an active loan or physical copy as Lost or Damaged, automatically
          close the loan, transition inventory, and assess a replacement charge.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Barcode input & scanner */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Copy Barcode
          </label>
          <BarcodeScanner
            onDetected={(code) => setBarcode(code)}
            label="Scan Copy Barcode"
          />
          <Input
            placeholder="e.g. BC-000123"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Status Selection: LOST vs DAMAGED */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Assessment Status
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStatus("LOST")}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                status === "LOST"
                  ? "border-danger bg-danger/10 text-danger font-semibold"
                  : "border-border text-foreground hover:bg-surface-hover"
              }`}
            >
              <div>
                <p className="text-sm font-bold">Lost Copy</p>
                <p className="text-xs text-muted-foreground">
                  Book is missing or unreturned
                </p>
              </div>
              <Badge variant="danger">LOST</Badge>
            </button>

            <button
              type="button"
              onClick={() => setStatus("DAMAGED")}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                status === "DAMAGED"
                  ? "border-warning bg-warning/10 text-warning font-semibold"
                  : "border-border text-foreground hover:bg-surface-hover"
              }`}
            >
              <div>
                <p className="text-sm font-bold">Damaged Copy</p>
                <p className="text-xs text-muted-foreground">
                  Returned with tears, water, or defaced
                </p>
              </div>
              <Badge variant="warning">DAMAGED</Badge>
            </button>
          </div>
        </div>

        {/* Fee Assessment (KES) */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Fee / Replacement Charge (KES)
          </label>
          <Input
            type="number"
            min="0"
            step="0.5"
            placeholder="0.00"
            value={feeKes}
            onChange={(e) => setFeeKes(e.target.value)}
            helperText="Enter replacement cost or repair fee to debit directly to the patron's fine ledger. Leave 0 for no charge."
          />
        </div>

        {/* Mandatory Reason */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Audit Reason <span className="text-danger">*</span>
          </label>
          <Input
            required
            placeholder="Explain damage or loss details..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {QUICK_REASONS[status].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(preset)}
                className="text-[11px] px-2 py-0.5 rounded-full bg-surface-raised border border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Button
          type="submit"
          variant={status === "LOST" ? "danger" : "primary"}
          className="w-full"
          disabled={(!barcode && !initialLoanId) || !reason.trim()}
          isLoading={loading}
        >
          {status === "LOST"
            ? "Mark Copy as LOST & Post Charge"
            : "Mark Copy as DAMAGED & Post Charge"}
        </Button>
      </form>

      {/* Result feedback */}
      {result && (
        <Alert
          variant={result.copy.status === "LOST" ? "error" : "warning"}
          title={`Successfully Processed as ${result.copy.status}`}
        >
          <div className="space-y-1 mt-1 text-xs">
            <p>
              Title: <strong>{result.bookTitle}</strong> (Barcode:{" "}
              <span className="font-mono">{result.copy.barcode}</span>)
            </p>
            <p>
              Copy Status: <strong>{result.copy.status}</strong>
            </p>
            {result.loan ? (
              <p className="text-success font-medium">
                Active loan closed (Status: {result.loan.status})
              </p>
            ) : (
              <p className="text-muted-foreground">
                No active loan was attached (shelf inventory updated).
              </p>
            )}
            {result.feeMinorUnits > 0 ? (
              <p className="text-sm font-bold text-danger">
                Ledger Charge Posted: {formatKes(result.feeMinorUnits)}
              </p>
            ) : (
              <p className="text-muted-foreground">
                Zero replacement fee assessed.
              </p>
            )}
          </div>
        </Alert>
      )}
    </div>
  );
}
