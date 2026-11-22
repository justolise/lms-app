"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usersService } from "../services/users.service";

interface DeactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeactivateModal({ isOpen, onClose }: DeactivateModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      await usersService.deactivateAccount();
      router.push("/login?message=Account%20deactivated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivation failed");
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Deactivate Account">
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <p className="text-sm text-muted-foreground">
          Are you sure you want to deactivate your account? You will immediately
          lose access to the system. You may contact your library administrator
          to re-enable your account.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" isLoading={loading} onClick={handleConfirm}>
            Confirm Deactivation
          </Button>
        </div>
      </div>
    </Modal>
  );
}
