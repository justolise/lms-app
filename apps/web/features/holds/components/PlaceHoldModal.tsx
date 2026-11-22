"use client";

import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { CatalogueItem } from "@/features/catalogue/types/catalogue.types";
import { placeHold } from "../services/holds.service";
import type { Hold } from "../types/holds.types";

interface PlaceHoldModalProps {
  isOpen: boolean;
  item: CatalogueItem | null;
  onClose: () => void;
  onSuccess: (hold: Hold) => void;
}

export function PlaceHoldModal({
  isOpen,
  item,
  onClose,
  onSuccess,
}: PlaceHoldModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  async function handleConfirm() {
    if (!item) return;
    setLoading(true);
    setError(null);
    try {
      const hold = await placeHold({ catalogueItemId: item.id });
      onSuccess(hold);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place hold");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Place Hold"
      size="sm"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} isLoading={loading}>
            Confirm Hold
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No copies of this title are currently available. You can join the
          waiting queue and you'll be notified when a copy becomes ready for
          pickup.
        </p>

        <div className="rounded-lg border border-border bg-surface-raised p-4 space-y-1">
          <p className="font-semibold text-foreground text-sm">{item.title}</p>
          {item.authors?.length > 0 && (
            <p className="text-xs text-muted-foreground">
              by {item.authors.join(", ")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {item.totalCopies} total cop{item.totalCopies === 1 ? "y" : "ies"}{" "}
            &mdash; all currently on loan
          </p>
        </div>

        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning-foreground">
          <strong>Pickup window:</strong> Once a copy is returned and assigned
          to your hold, you'll have <strong>72 hours</strong> to collect it
          before the hold expires.
        </div>

        {error && <Alert variant="error">{error}</Alert>}
      </div>
    </Modal>
  );
}
