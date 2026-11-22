"use client";

import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { formatKes } from "@/utils/currency";
import { circulationService } from "../services/circulation.service";
import type { ReturnLoanResult } from "../types/circulation.types";
import { BarcodeScanner } from "./BarcodeScanner";

export function ReturnDesk() {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReturnLoanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await circulationService.returnLoan({ barcode });
      setResult(res);
      setBarcode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Return Desk</h2>
        <p className="text-sm text-muted-foreground">
          Check in a returned book and automatically calculate any overdue
          fines.
        </p>
      </div>

      <form onSubmit={handleReturn} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Copy Barcode
          </label>
          <BarcodeScanner
            onDetected={(code) => setBarcode(code)}
            label="Scan Return Barcode"
          />
          {barcode && (
            <p className="text-xs font-mono bg-success/10 text-success border border-success/20 rounded px-2.5 py-1">
              Selected Barcode: {barcode}
            </p>
          )}
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={!barcode}
          isLoading={loading}
        >
          Check In Book
        </Button>
      </form>

      {result && (
        <>
          <Alert
            variant={result.overdueDays > 0 ? "warning" : "success"}
            title={
              result.overdueDays > 0
                ? `Returned ${result.overdueDays} Day(s) Overdue`
                : "Returned On Time!"
            }
          >
            <div className="space-y-1 mt-1 text-xs">
              <p>
                Status:{" "}
                <strong>
                  {result.holdFulfilled ? "ON HOLD (reserved)" : "AVAILABLE"}
                </strong>
              </p>
              {result.fineMinorUnits > 0 ? (
                <p className="text-sm font-bold text-danger">
                  Fine Due: {formatKes(result.fineMinorUnits)}
                </p>
              ) : (
                <p className="text-success font-medium">No fine charged.</p>
              )}
              <p className="font-mono text-muted-foreground">
                Loan ID: {result.loan.id}
              </p>
            </div>
          </Alert>

          {result.holdFulfilled && (
            <Alert
              variant="info"
              title="Hold Fulfilled — Copy Reserved for Pickup"
            >
              <p className="text-xs mt-1">
                This copy has been automatically reserved for the next patron
                waiting in the hold queue. It is <strong>not available</strong>{" "}
                for general checkout.
                {result.holdExpiresAt && (
                  <>
                    {" "}
                    Pickup window expires on{" "}
                    <strong>
                      {new Date(result.holdExpiresAt).toLocaleString("en-KE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </strong>
                    .
                  </>
                )}
              </p>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
