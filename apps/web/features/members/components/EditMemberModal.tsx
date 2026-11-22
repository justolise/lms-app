"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { membersService } from "../services/members.service";
import type {
  MemberDirectoryItem,
  MemberTypeOption,
} from "../types/members.types";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberDirectoryItem | null;
  onUpdated: () => void;
}

export function EditMemberModal({
  isOpen,
  onClose,
  member,
  onUpdated,
}: EditMemberModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [memberTypeId, setMemberTypeId] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [membershipExpiresAt, setMembershipExpiresAt] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");

  const [memberTypes, setMemberTypes] = useState<MemberTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTypes() {
      try {
        const types = await membersService.listMemberTypes();
        setMemberTypes(types);
      } catch {
        // Non-blocking
      }
    }
    if (isOpen) {
      loadTypes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (member) {
      setFullName(member.fullName || "");
      setEmail(member.email || "");
      setPhone(member.phone || "");
      setAdmissionNumber(member.admissionNumber || "");
      setMemberTypeId(member.memberTypeId || "");
      setPhotoUrl(member.photoUrl || "");
      setStatus(member.status || "ACTIVE");
      setMembershipExpiresAt(
        member.membershipExpiresAt
          ? member.membershipExpiresAt.slice(0, 10)
          : "",
      );
      setError(null);
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setLoading(true);
    setError(null);

    try {
      await membersService.updateMember(member.id, {
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        admissionNumber: admissionNumber.trim() || undefined,
        memberTypeId: memberTypeId || undefined,
        photoUrl: photoUrl.trim() || undefined,
        membershipExpiresAt: membershipExpiresAt || undefined,
        status,
      });

      onUpdated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update member profile",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Member Profile"
      description={`Update member identification, borrowing limits, and contacts for ${member.fullName} (MEM-1).`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">
            Full Name *
          </label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Admission / Student #
            </label>
            <Input
              placeholder="e.g. ADM-2026-0042"
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Member Type *
            </label>
            <Select
              value={memberTypeId}
              onChange={(e) => setMemberTypeId(e.target.value)}
              options={memberTypes.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Phone Number
            </label>
            <Input
              placeholder="+254..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Membership Expiry
            </label>
            <Input
              type="date"
              value={membershipExpiresAt}
              onChange={(e) => setMembershipExpiresAt(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Account Status
            </label>
            <Select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "ACTIVE" | "SUSPENDED")
              }
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "SUSPENDED", label: "Suspended" },
              ]}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">
            Photo URL (HTTPS)
          </label>
          <Input
            type="url"
            placeholder="https://..."
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
          />
        </div>

        <div className="pt-4 flex justify-end gap-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !fullName.trim()}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
