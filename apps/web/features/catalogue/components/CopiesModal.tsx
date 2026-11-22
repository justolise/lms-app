"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { catalogueService } from "../services/catalogue.service";
import {
  type CatalogueItem,
  COPY_CONDITIONS,
  COPY_STATUSES,
  type CopyItem,
} from "../types/catalogue.types";

interface CopiesModalProps {
  item: CatalogueItem | null;
  isOpen: boolean;
  onClose: () => void;
  onCopiesChanged: () => void;
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

  async function handleStatusChange(copyId: string, status: string) {
    if (!item) return;
    setError(null);
    try {
      await catalogueService.updateCopyStatus(item.id, copyId, status);
      loadCopies();
      onCopiesChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update copy status",
      );
    }
  }

  async function handleWithdraw(copyId: string, barcode: string) {
    if (!item) return;
    if (!confirm(`Are you sure you want to withdraw copy "${barcode}"?`))
      return;

    setError(null);
    try {
      await catalogueService.withdrawCopy(item.id, copyId);
      loadCopies();
      onCopiesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to withdraw copy");
    }
  }

  return (
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
              {copies.map((copy) => (
                <div
                  key={copy.id}
                  className="p-3 flex items-center justify-between text-xs gap-3"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-foreground">
                      {copy.barcode}
                    </span>
                    <div className="text-muted-foreground flex gap-2">
                      <span>Condition: {copy.condition}</span>
                      {copy.shelfLocation && (
                        <span>Shelf: {copy.shelfLocation}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={copy.status}
                      onChange={(e) =>
                        handleStatusChange(copy.id, e.target.value)
                      }
                      options={COPY_STATUSES.map((s) => ({
                        value: s,
                        label: s,
                      }))}
                      className="text-xs py-1 px-2"
                    />

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleWithdraw(copy.id, copy.barcode)}
                      className="text-danger hover:text-danger hover:bg-danger/10"
                    >
                      Withdraw
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
