"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { memberTypesService } from "../services/member-types.service";
import type { MemberTypeSummary } from "../types/member-types.types";

interface MemberTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (id?: string) => void;
  editingType?: MemberTypeSummary | null;
}

export function MemberTypeModal({
  isOpen,
  onClose,
  onSuccess,
  editingType,
}: MemberTypeModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingType) {
      setName(editingType.name);
      setDescription(editingType.description || "");
      setIsActive(editingType.isActive);
    } else {
      setName("");
      setDescription("");
      setIsActive(true);
    }
    setError(null);
  }, [editingType, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      if (editingType) {
        await memberTypesService.update(editingType.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          isActive,
        });
        onSuccess(editingType.id);
      } else {
        const created = await memberTypesService.create({
          name: name.trim(),
          description: description.trim() || undefined,
        });
        onSuccess(created.id);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save member type",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingType ? "Edit Member Type" : "Create Member Type"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Member Type Name *
          </label>
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Student, Faculty, Community Member"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Description
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>

        {editingType && (
          <div className="flex items-center gap-2 pt-1">
            <input
              id="type-active-checkbox"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label
              htmlFor="type-active-checkbox"
              className="text-xs font-medium text-foreground cursor-pointer select-none"
            >
              Active member type
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {editingType ? "Save Changes" : "Create Type"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
