"use client";

import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { usersService } from "../services/users.service";
import type { InviteLibrarianResult } from "../types/users.types";

interface LibrarianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LibrarianModal({
  isOpen,
  onClose,
  onSuccess,
}: LibrarianModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<InviteLibrarianResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFullName("");
    setEmail("");
    setPhone("");
    setResult(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await usersService.inviteLibrarian({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setResult(res);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to register librarian",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title={result ? "Librarian Created" : "Add New Librarian"}
    >
      {result ? (
        <div className="space-y-4">
          <Alert variant="success">
            Librarian <strong>{result.fullName}</strong> was registered
            successfully!
          </Alert>

          {result.temporaryPassword && (
            <div className="p-3 bg-surface-raised rounded-xl border border-border space-y-1">
              <span className="text-xs text-muted-foreground block">
                Temporary Password (provide to user):
              </span>
              <span className="text-sm font-mono font-bold text-foreground">
                {result.temporaryPassword}
              </span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Full Name *
            </label>
            <Input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Grace Wanjiku"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Email (Optional)
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="grace@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Phone Number (Optional)
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 700 000000"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Create Librarian
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
