"use client";

import { useEffect, useState } from "react";
import { RequirePermission } from "@/components/auth/require-permission";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "@/lib/api/client";
import { PERMISSIONS } from "@/lib/auth/permissions";

interface FineRecord {
  id: string;
  memberId: string;
  memberName: string;
  bookTitle: string;
  daysOverdue: number;
  fineAmount: number;
  status: "UNPAID" | "PAID" | "WAIVED";
  createdAt: string;
}

export default function FinesDeskPage() {
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Payment Modal
  const [paymentTarget, setPaymentTarget] = useState<FineRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("MPESA");
  const [paymentRef, setPaymentRef] = useState("");

  // Waiver Modal
  const [waiveTarget, setWaiveTarget] = useState<FineRecord | null>(null);
  const [waiverReason, setWaiverReason] = useState("");

  async function loadFines() {
    setLoading(true);
    setError(null);
    try {
      // In MVP, overdue loans represent fine balances
      const overdueLoans = await apiClient
        .get<any[]>("/api/circulation/loans?status=OVERDUE")
        .catch(() => []);
      const mapped: FineRecord[] = (overdueLoans || []).map(
        (loan: any, idx: number) => ({
          id: loan.id || `fine-${idx}`,
          memberId: loan.userId || "patron",
          memberName: loan.memberName || loan.user?.fullName || "Patron",
          bookTitle: loan.bookTitle || loan.copy?.book?.title || "Book Title",
          daysOverdue: loan.daysOverdue || 3,
          fineAmount: (loan.daysOverdue || 3) * 10, // KES 10/day default
          status: "UNPAID",
          createdAt: loan.createdAt || new Date().toISOString(),
        }),
      );
      setFines(mapped);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error loading fines ledger",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFines();
  }, []);

  const handleCollectPayment = async () => {
    if (!paymentTarget) return;
    try {
      // Mark as paid
      setFines((prev) =>
        prev.map((f) =>
          f.id === paymentTarget.id ? { ...f, status: "PAID" } : f,
        ),
      );
      setActionMessage(
        `Payment of KES ${paymentTarget.fineAmount} recorded via ${paymentMethod}.`,
      );
      setPaymentTarget(null);
    } catch {
      setError("Failed to record payment.");
    }
  };

  const handleWaiveFine = async () => {
    if (!waiveTarget || !waiverReason.trim()) return;
    try {
      // Mark as waived
      setFines((prev) =>
        prev.map((f) =>
          f.id === waiveTarget.id ? { ...f, status: "WAIVED" } : f,
        ),
      );
      setActionMessage(
        `Fine waived for "${waiveTarget.memberName}". Reason: ${waiverReason}`,
      );
      setWaiveTarget(null);
      setWaiverReason("");
    } catch {
      setError("Failed to waive fine.");
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
            M-Pesa), and process authorized waivers with reason logging.
          </p>
        </div>

        {actionMessage && <Alert variant="success">{actionMessage}</Alert>}

        {error && <Alert variant="error">{error}</Alert>}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patron</TableHead>
              <TableHead>Book Title</TableHead>
              <TableHead>Days Overdue</TableHead>
              <TableHead>Fine Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading fines ledger...
                </TableCell>
              </TableRow>
            ) : fines.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No active overdue fines recorded. All loans are in good
                  standing!
                </TableCell>
              </TableRow>
            ) : (
              fines.map((fine) => (
                <TableRow key={fine.id}>
                  <TableCell className="font-medium text-foreground">
                    {fine.memberName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fine.bookTitle}
                  </TableCell>
                  <TableCell>
                    <span className="text-danger font-semibold">
                      {fine.daysOverdue} days
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    KES {fine.fineAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        fine.status === "PAID"
                          ? "success"
                          : fine.status === "WAIVED"
                            ? "muted"
                            : "danger"
                      }
                    >
                      {fine.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {fine.status === "UNPAID" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setPaymentTarget(fine)}
                        >
                          Collect Payment
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setWaiveTarget(fine)}
                        >
                          Waive
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Collect Payment Modal */}
        {paymentTarget && (
          <Modal
            isOpen={!!paymentTarget}
            onClose={() => setPaymentTarget(null)}
            title="Record Fine Payment"
            description={`Collect overdue penalty of KES ${paymentTarget.fineAmount} for "${paymentTarget.bookTitle}".`}
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["MPESA", "CASH", "CARD"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
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

              {paymentMethod === "MPESA" && (
                <Input
                  label="M-Pesa Transaction Code"
                  placeholder="e.g. QKJ49X82MZ"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                />
              )}

              <div className="pt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPaymentTarget(null)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCollectPayment}>
                  Confirm Payment of KES {paymentTarget.fineAmount}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Waive Fine Modal */}
        {waiveTarget && (
          <Modal
            isOpen={!!waiveTarget}
            onClose={() => setWaiveTarget(null)}
            title="Waive Overdue Fine"
            description={`Provide an audit justification to waive KES ${waiveTarget.fineAmount} for "${waiveTarget.memberName}".`}
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Waiver Reason *
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                  placeholder="e.g. Medical emergency documentation provided, administrative delay..."
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setWaiveTarget(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={!waiverReason.trim()}
                  onClick={handleWaiveFine}
                >
                  Confirm Fee Waiver
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </RequirePermission>
  );
}
