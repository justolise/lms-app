"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKes } from "@/utils/currency";
import { formatDate } from "@/utils/date";
import { membersService } from "../services/members.service";
import type {
  MemberDirectoryItem,
  MemberLoanItem,
} from "../types/members.types";

interface MemberHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberDirectoryItem | null;
}

export function MemberHistoryModal({
  isOpen,
  onClose,
  member,
}: MemberHistoryModalProps) {
  const [loans, setLoans] = useState<MemberLoanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      if (!member) return;
      setLoading(true);
      setError(null);
      try {
        const data = await membersService.getBorrowingHistory(member.id);
        setLoans(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load borrowing history",
        );
      } finally {
        setLoading(false);
      }
    }

    if (isOpen && member) {
      fetchHistory();
    }
  }, [isOpen, member]);

  if (!member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Borrowing History — ${member.fullName}`}
      description={`Past and current circulation records for ${member.fullName} (${member.admissionNumber || "No admission #"}). Access restricted per MEM-4.`}
    >
      <div className="space-y-4 py-2">
        {error && <Alert variant="error">{error}</Alert>}

        {loading ? (
          <div className="h-44 flex items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : loans.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
            No past borrowing or loan records found for this member.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book Title</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due / Returned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Fine</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => {
                  const isOverdue =
                    loan.status === "ACTIVE" &&
                    new Date(loan.dueAt) < new Date();

                  return (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <div className="font-semibold text-foreground text-xs">
                          {loan.bookTitle}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {loan.bookAuthor} • {loan.bookFormat}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {loan.copyBarcode}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(loan.checkedOutAt)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {loan.returnedAt ? (
                          <span className="text-muted-foreground">
                            Ret: {formatDate(loan.returnedAt)}
                          </span>
                        ) : (
                          <span
                            className={
                              isOverdue
                                ? "font-bold text-danger"
                                : "text-foreground"
                            }
                          >
                            Due: {formatDate(loan.dueAt)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            loan.status === "RETURNED"
                              ? "muted"
                              : isOverdue
                                ? "danger"
                                : "success"
                          }
                        >
                          {isOverdue ? "OVERDUE" : loan.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs">
                        {loan.fineMinorUnits && loan.fineMinorUnits > 0 ? (
                          <span className="text-danger font-bold">
                            {formatKes(loan.fineMinorUnits)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            KES 0.00
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="pt-4 flex justify-end border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
