"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { catalogueService } from "../services/catalogue.service";
import {
  type CatalogueItem,
  COPY_CONDITIONS,
  type CopyItem,
  type CopyStatus,
} from "../types/catalogue.types";

interface CopiesModalProps {
  item: CatalogueItem | null;
  isOpen: boolean;
  onClose: () => void;
  onCopiesChanged: () => void;
}

const ALLOWED_TRANSITIONS: Record<string, CopyStatus[]> = {
  AVAILABLE: ["ON_LOAN", "RESERVED", "LOST", "DAMAGED", "WITHDRAWN"],
  ON_LOAN: ["AVAILABLE", "LOST", "DAMAGED"],
  RESERVED: ["ON_LOAN", "AVAILABLE"],
  IN_TRANSIT: ["AVAILABLE"],
  LOST: ["AVAILABLE", "WITHDRAWN"],
  DAMAGED: ["AVAILABLE", "WITHDRAWN"],
  WITHDRAWN: [],
};

const PRESET_REASONS = [
  "Missing during shelf audit / stocktake",
  "Patron reported lost",
  "Water / liquid damage",
  "Torn pages / broken binding",
  "Repaired and restored to circulation",
  "Weeded / outdated edition",
];

function getStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "AVAILABLE":
      return "success";
    case "ON_LOAN":
      return "primary";
    case "RESERVED":
    case "IN_TRANSIT":
      return "warning";
    case "LOST":
      return "danger";
    case "DAMAGED":
      return "warning";
    default:
      return "muted";
  }
}

export function CopiesModal({
  item,
  isOpen,
  onClose,
  onCopiesChanged,
}: CopiesModalProps) {
  const [copies, setCopies] = useState<CopyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBarcode, setNewBarcode] = useState("");
  const [newCondition, setNewCondition] = useState("NEW");
  const [newShelf, setNewShelf] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status Change Dialog state
  const [selectedCopy, setSelectedCopy] = useState<CopyItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<CopyStatus | "">("");
  const [statusReason, setStatusReason] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusDialogError, setStatusDialogError] = useState<string | null>(
    null,
  );

  async function loadCopies() {
    if (!item) return;
    setLoading(true);
    setError(null);
    try {
      const data = await catalogueService.getById(item.id);
      setCopies(Array.isArray(data.copies) ? data.copies : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load copies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen && item) {
      setNewBarcode("");
      setNewCondition("NEW");
      setNewShelf(item.shelfLocation || "");
      setSelectedCopy(null);
      loadCopies();
    }
  }, [isOpen, item]);

  async function handleAddCopy(e: React.FormEvent) {
    e.preventDefault();
    if (!item || !newBarcode.trim()) return;

    setAdding(true);
    setError(null);
    try {
      await catalogueService.addCopy(item.id, {
        barcode: newBarcode.trim(),
        condition: newCondition,
        shelfLocation: newShelf.trim() || undefined,
      });
      setNewBarcode("");
      loadCopies();
      onCopiesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add copy");
    } finally {
      setAdding(false);
    }
  }

  function openStatusDialog(copy: CopyItem, defaultTarget?: CopyStatus) {
    const allowed = ALLOWED_TRANSITIONS[copy.status] || [];
    setSelectedCopy(copy);
    setTargetStatus(
      defaultTarget && allowed.includes(defaultTarget)
        ? defaultTarget
        : allowed[0] || "",
    );
    setStatusReason("");
    setStatusDialogError(null);
  }

  function closeStatusDialog() {
    setSelectedCopy(null);
    setTargetStatus("");
    setStatusReason("");
    setStatusDialogError(null);
  }

  async function handleConfirmStatusChange(e: React.FormEvent) {
    e.preventDefault();
    if (!item || !selectedCopy || !targetStatus) return;

    if (!statusReason.trim() || statusReason.trim().length < 3) {
      setStatusDialogError(
        "Reason is mandatory and must be at least 3 characters",
      );
      return;
    }

    setUpdatingStatus(true);
    setStatusDialogError(null);
    try {
      if (targetStatus === "WITHDRAWN") {
        await catalogueService.withdrawCopy(
          item.id,
          selectedCopy.id,
          statusReason,
        );
      } else {
        await catalogueService.updateCopyStatus(
          item.id,
          selectedCopy.id,
          targetStatus,
          statusReason,
        );
      }
      closeStatusDialog();
      loadCopies();
      onCopiesChanged();
    } catch (err) {
      setStatusDialogError(
        err instanceof Error ? err.message : "Failed to update copy status",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Manage Copies — ${item?.title || ""}`}
      >
        <div className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}

          {/* Add Copy Form */}
          <form
            onSubmit={handleAddCopy}
            className="bg-surface-raised rounded-xl p-4 border border-border space-y-3"
          >
            <div className="text-xs font-semibold text-foreground">
              Register New Physical Copy
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <Input
                  required
                  placeholder="Barcode / Accession #"
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                />
              </div>
              <div>
                <Select
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  options={COPY_CONDITIONS.map((c) => ({ value: c, label: c }))}
                />
              </div>
              <div>
                <Input
                  placeholder="Shelf Location (opt)"
                  value={newShelf}
                  onChange={(e) => setNewShelf(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" isLoading={adding}>
                + Add Copy
              </Button>
            </div>
          </form>

          {/* Copies List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Existing Copies ({copies.length})
            </div>

            {loading ? (
              <div className="py-8 flex justify-center">
                <Spinner size="md" />
              </div>
            ) : copies.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                No copies registered yet for this title.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface">
                {copies.map((copy) => {
                  const allowed = ALLOWED_TRANSITIONS[copy.status] || [];
                  const isWithdrawn = copy.status === "WITHDRAWN";

                  return (
                    <div
                      key={copy.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-foreground">
                            {copy.barcode}
                          </span>
                          <Badge variant={getStatusBadgeVariant(copy.status)}>
                            {copy.status}
                          </Badge>
                          <span className="text-muted-foreground">
                            • Condition: {copy.condition}
                          </span>
                        </div>
                        {copy.shelfLocation && (
                          <div className="text-muted-foreground">
                            Shelf Location: {copy.shelfLocation}
                          </div>
                        )}
                        {copy.notes && (
                          <div className="text-[11px] text-muted-foreground/80 font-mono bg-surface-raised px-2 py-1 rounded border border-border/50 whitespace-pre-line mt-1">
                            {copy.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isWithdrawn && allowed.length > 0 && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openStatusDialog(copy)}
                              className="text-xs"
                            >
                              Update Status
                            </Button>
                            {allowed.includes("WITHDRAWN") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  openStatusDialog(copy, "WITHDRAWN")
                                }
                                className="text-xs text-danger hover:text-danger hover:bg-danger/10"
                              >
                                Withdraw
                              </Button>
                            )}
                          </>
                        )}
                        {isWithdrawn && (
                          <span className="text-[11px] italic text-muted-foreground">
                            Withdrawn (Terminal)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Status Change & Audit Reason Modal (INV-2) */}
      <Modal
        isOpen={Boolean(selectedCopy)}
        onClose={closeStatusDialog}
        title={`Change Copy Status — ${selectedCopy?.barcode || ""}`}
      >
        <form onSubmit={handleConfirmStatusChange} className="space-y-4">
          {statusDialogError && (
            <Alert variant="error">{statusDialogError}</Alert>
          )}

          <div className="bg-surface-raised p-3 rounded-lg border border-border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Status:</span>
              <Badge
                variant={getStatusBadgeVariant(selectedCopy?.status || "")}
              >
                {selectedCopy?.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Barcode:</span>
              <span className="font-mono font-medium text-foreground">
                {selectedCopy?.barcode}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              New Status <span className="text-danger">*</span>
            </label>
            <Select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as CopyStatus)}
              options={
                selectedCopy
                  ? (ALLOWED_TRANSITIONS[selectedCopy.status] || []).map(
                      (s) => ({
                        value: s,
                        label: s,
                      }),
                    )
                  : []
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Mandatory Reason <span className="text-danger">*</span>
              </label>
              <span className="text-[10px] text-muted-foreground">
                Recorded in immutable audit trail
              </span>
            </div>
            <textarea
              required
              rows={3}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Provide a detailed explanation for this copy status change..."
              className="w-full text-xs rounded-lg border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Quick Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setStatusReason(preset)}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-surface-raised hover:bg-surface border border-border text-foreground transition-colors cursor-pointer text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeStatusDialog}
              disabled={updatingStatus}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={updatingStatus}
              disabled={!statusReason.trim() || statusReason.trim().length < 3}
            >
              Confirm Status Change
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
