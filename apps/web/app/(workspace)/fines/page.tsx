"use client";

import { useEffect, useState } from "react";
import { RequirePermission } from "@/components/auth/require-permission";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { finesService } from "@/features/fines/services/fines.service";
import type {
  FineEntry,
  FinePaymentMethod,
} from "@/features/fines/types/fines.types";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatKes } from "@/utils/currency";
import { formatDate } from "@/utils/date";

export default function FinesDeskPage() {
  const [entries, setEntries] = useState<FineEntry[]>([]);
  const [filterType, setFilterType] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Payment Modal state
  const [paymentTarget, setPaymentTarget] = useState<FineEntry | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<FinePaymentMethod>("MPESA");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentAmountKes, setPaymentAmountKes] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Receipt Modal state (FIN-3)
  const [activeReceipt, setActiveReceipt] = useState<FineEntry | null>(null);

  // Waiver Modal state (FIN-2)
  const [waiveTarget, setWaiveTarget] = useState<FineEntry | null>(null);
  const [waiverReason, setWaiverReason] = useState("");
  const [waiveAmountKes, setWaiveAmountKes] = useState<number>(0);
  const [isSubmittingWaiver, setIsSubmittingWaiver] = useState(false);

  async function loadLedger() {
    setLoading(true);
    setError(null);
    try {
      const data = await finesService.listLedger({
        entryType: filterType || undefined,
      });
      setEntries(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error loading fines ledger",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLedger();
  }, [filterType]);

  // Aggregate metrics
  const totalCharges = entries
    .filter((e) => e.entryType === "CHARGE")
    .reduce((sum, e) => sum + e.amountMinorUnits, 0);

  const totalPayments = entries
    .filter((e) => e.entryType === "PAYMENT")
    .reduce((sum, e) => sum + e.amountMinorUnits, 0);

  const totalWaivers = entries
    .filter((e) => e.entryType === "WAIVER")
    .reduce((sum, e) => sum + e.amountMinorUnits, 0);

  // Handlers
  const openPaymentModal = (entry: FineEntry) => {
    setPaymentTarget(entry);
    setPaymentAmountKes(entry.amountMinorUnits / 100);
    setPaymentRef("");
    setPaymentNotes("");
  };

  const openWaiverModal = (entry: FineEntry) => {
    setWaiveTarget(entry);
    setWaiveAmountKes(entry.amountMinorUnits / 100);
    setWaiverReason("");
  };

  const handleRecordPayment = async () => {
    if (!paymentTarget || paymentAmountKes <= 0) return;
    setIsSubmittingPayment(true);
    setError(null);
    try {
      const amountMinorUnits = Math.round(paymentAmountKes * 100);
      const res = await finesService.recordPayment({
        userId: paymentTarget.userId,
        amountMinorUnits,
        paymentMethod,
        paymentReference: paymentRef.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });

      setActionMessage(
        `Payment of ${formatKes(amountMinorUnits)} recorded successfully. Receipt #: ${res.receiptNumber}`,
      );
      setPaymentTarget(null);
      await loadLedger();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleWaiveFine = async () => {
    if (!waiveTarget || !waiverReason.trim() || waiveAmountKes <= 0) return;
    setIsSubmittingWaiver(true);
    setError(null);
    try {
      const amountMinorUnits = Math.round(waiveAmountKes * 100);
      await finesService.waiveFine({
        userId: waiveTarget.userId,
        amountMinorUnits,
        waiverReason: waiverReason.trim(),
        loanId: waiveTarget.loanId || undefined,
      });

      setActionMessage(
        `Fine of ${formatKes(amountMinorUnits)} waived for ${waiveTarget.patronName}. Reason logged for audit.`,
      );
      setWaiveTarget(null);
      await loadLedger();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to waive fine");
    } finally {
      setIsSubmittingWaiver(false);
    }
  };

  return (
    <RequirePermission permission={PERMISSIONS.CIRCULATION_OVERRIDE}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Fines &amp; Waivers Desk
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit overdue penalty assessments, collect fine receipts (Cash,
            M-Pesa, Card), and process authorized waivers with audit
            justification (FIN-1, FIN-2).
          </p>
        </div>

        {actionMessage && <Alert variant="success">{actionMessage}</Alert>}

        {error && <Alert variant="error">{error}</Alert>}

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs uppercase font-semibold">
                Total Fines Assessed
              </CardDescription>
              <CardTitle className="text-xl font-bold text-foreground">
                {formatKes(totalCharges)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
              Calculated on return or lost copies
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs uppercase font-semibold text-emerald-600 dark:text-emerald-400">
                Total Collections
              </CardDescription>
              <CardTitle className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatKes(totalPayments)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
              Collected via M-Pesa, Cash, or Card
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs uppercase font-semibold text-amber-600 dark:text-amber-400">
                Total Authorized Waivers
              </CardDescription>
              <CardTitle className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {formatKes(totalWaivers)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
              Staff-approved with audit logging
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Filter by Entry Type:
            </span>
            <div className="w-44">
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                options={[
                  { value: "", label: "All Entries" },
                  { value: "CHARGE", label: "Charges Only" },
                  { value: "PAYMENT", label: "Payments Only" },
                  { value: "WAIVER", label: "Waivers Only" },
                ]}
              />
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadLedger}
            disabled={loading}
          >
            Refresh Ledger
          </Button>
        </div>

        {/* Append-only Ledger Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date &amp; Time</TableHead>
              <TableHead>Patron</TableHead>
              <TableHead>Context / Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reference / Audit Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Spinner size="md" />
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground text-xs"
                >
                  No fine ledger records found.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(entry.createdAt, true)}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-foreground text-xs">
                      {entry.patronName}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {entry.patronPhone || entry.patronEmail || "No contact"}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-foreground max-w-xs truncate">
                    {entry.bookTitle || entry.notes || "General Account"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        entry.entryType === "PAYMENT"
                          ? "success"
                          : entry.entryType === "WAIVER"
                            ? "muted"
                            : "danger"
                      }
                    >
                      {entry.entryType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-foreground">
                    {formatKes(entry.amountMinorUnits)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {entry.entryType === "PAYMENT" && (
                      <span className="inline-flex items-center gap-1.5 font-mono">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {entry.paymentMethod}
                        </span>
                        {entry.paymentReference &&
                          `(${entry.paymentReference})`}
                        {entry.receiptNumber && `• ${entry.receiptNumber}`}
                      </span>
                    )}
                    {entry.entryType === "WAIVER" && (
                      <span className="italic text-foreground">
                        {entry.waiverReason}
                      </span>
                    )}
                    {entry.entryType === "CHARGE" && (
                      <span>{entry.notes || "Overdue penalty"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    {entry.entryType === "CHARGE" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => openPaymentModal(entry)}
                        >
                          Collect
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openWaiverModal(entry)}
                        >
                          Waive
                        </Button>
                      </>
                    )}
                    {entry.entryType === "PAYMENT" && entry.receiptNumber && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveReceipt(entry)}
                      >
                        Receipt
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Collect Payment Modal (FIN-2, FIN-3) */}
        {paymentTarget && (
          <Modal
            isOpen={!!paymentTarget}
            onClose={() => setPaymentTarget(null)}
            title="Record Fine Payment"
            description={`Collect fine payment for ${paymentTarget.patronName}. A tamper-proof receipt will be generated.`}
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Payment Method *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["MPESA", "CASH", "CARD"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        paymentMethod === m
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-surface-hover"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Payment Amount (KES) *
                </label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={paymentAmountKes}
                  onChange={(e) =>
                    setPaymentAmountKes(parseFloat(e.target.value) || 0)
                  }
                  required
                />
              </div>

              {paymentMethod === "MPESA" && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-foreground">
                    M-Pesa Transaction Code
                  </label>
                  <Input
                    placeholder="e.g. QKJ49X82MZ"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Notes / Teller Memo
                </label>
                <Input
                  placeholder="Optional payment notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPaymentTarget(null)}
                  disabled={isSubmittingPayment}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  disabled={isSubmittingPayment || paymentAmountKes <= 0}
                >
                  {isSubmittingPayment
                    ? "Recording..."
                    : `Confirm Payment of KES ${paymentAmountKes.toFixed(2)}`}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Waive Fine Modal (FIN-2) */}
        {waiveTarget && (
          <Modal
            isOpen={!!waiveTarget}
            onClose={() => setWaiveTarget(null)}
            title="Waive Overdue Fine"
            description={`Authorized staff waiver for ${waiveTarget.patronName}. Mandatory audit justification required.`}
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Waiver Amount (KES) *
                </label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={waiveAmountKes}
                  onChange={(e) =>
                    setWaiveAmountKes(parseFloat(e.target.value) || 0)
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Audit Justification Reason *
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                  placeholder="e.g. Hospital admission documentation presented, administrative delay on desk return..."
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  This reason is permanently preserved in the append-only ledger
                  and audit trail.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setWaiveTarget(null)}
                  disabled={isSubmittingWaiver}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={
                    !waiverReason.trim() ||
                    waiverReason.trim().length < 3 ||
                    waiveAmountKes <= 0 ||
                    isSubmittingWaiver
                  }
                  onClick={handleWaiveFine}
                >
                  {isSubmittingWaiver
                    ? "Waiving..."
                    : `Confirm Waiver of KES ${waiveAmountKes.toFixed(2)}`}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Payment Receipt Modal (FIN-3) */}
        {activeReceipt && (
          <Modal
            isOpen={!!activeReceipt}
            onClose={() => setActiveReceipt(null)}
            title="Official Fine Payment Receipt"
            description="LMS Official Payment Receipt (FIN-3)"
          >
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="font-bold text-foreground">
                    Receipt Number:
                  </span>
                  <span className="text-primary font-bold">
                    {activeReceipt.receiptNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="text-foreground">
                    {formatDate(activeReceipt.createdAt, true)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patron:</span>
                  <span className="text-foreground">
                    {activeReceipt.patronName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method:</span>
                  <span className="text-foreground font-semibold">
                    {activeReceipt.paymentMethod}
                  </span>
                </div>
                {activeReceipt.paymentReference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Reference / M-Pesa:
                    </span>
                    <span className="text-foreground">
                      {activeReceipt.paymentReference}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-sm">
                  <span className="font-bold text-foreground">
                    Amount Paid:
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatKes(activeReceipt.amountMinorUnits)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => window.print()}>
                  Print Receipt
                </Button>
                <Button onClick={() => setActiveReceipt(null)}>Close</Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </RequirePermission>
  );
}
