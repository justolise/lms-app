"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { categoriesService } from "../services/categories.service";
import type { Category } from "../types/categories.types";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  editingCategory?: Category | null;
}

export function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  editingCategory,
}: CategoryModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setDescription(editingCategory.description || "");
      setParentId(editingCategory.parentId || "");
    } else {
      setName("");
      setDescription("");
      setParentId("");
    }
    setError(null);
  }, [editingCategory, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      if (editingCategory) {
        await categoriesService.update(editingCategory.id, {
          name: name.trim(),
          description: description.trim() || null,
          parentId: parentId || null,
        });
      } else {
        await categoriesService.create({
          name: name.trim(),
          description: description.trim() || undefined,
          parentId: parentId || undefined,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setSaving(false);
    }
  }

  // Filter out self when editing parent
  const parentCandidates = categories.filter(
    (c) => !editingCategory || c.id !== editingCategory.id,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCategory ? "Edit Category" : "Create New Category"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Category Name *
          </label>
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Computer Science"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Parent Category (Optional)
          </label>
          <Select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            options={[
              { value: "", label: "None (Top Level)" },
              ...parentCandidates.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Description
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this category"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {editingCategory ? "Save Changes" : "Create Category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
