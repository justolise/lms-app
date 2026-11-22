"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { membersService } from "../services/members.service";
import type {
  CreateMemberResult,
  MemberTypeOption,
} from "../types/members.types";

interface CreateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateMemberModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateMemberModalProps) {
  const [memberTypes, setMemberTypes] = useState<MemberTypeOption[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [memberTypeId, setMemberTypeId] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [identifierType, setIdentifierType] = useState<string>("");
  const [identifierValue, setIdentifierValue] = useState("");
  const [membershipExpiresAt, setMembershipExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CreateMemberResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      membersService.listMemberTypes().then((types) => {
        setMemberTypes(types);
        if (types.length > 0 && !memberTypeId) {
          setMemberTypeId(types[0].id);
        }
      });
    }
  }, [isOpen, memberTypeId]);

  function reset() {
    setFullName("");
    setEmail("");
    setPhone("");
    setAdmissionNumber("");
    setIdentifierType("");
    setIdentifierValue("");
    setMembershipExpiresAt("");
    setResult(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !memberTypeId) return;
    if (!email.trim() && !phone.trim()) {
      setError("Please provide at least one contact method (email or phone).");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await membersService.create({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        memberTypeId,
        admissionNumber: admissionNumber.trim() || undefined,
        identifierType:
          (identifierType as
            | "NATIONAL_ID"
            | "ALIEN_ID"
            | "PASSPORT"
            | "OTHER") || undefined,
        identifierValue: identifierValue.trim() || undefined,
        membershipExpiresAt: membershipExpiresAt
          ? new Date(membershipExpiresAt).toISOString()
          : undefined,
      });
      setResult(res);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to register library member",
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
      title={result ? "Member Account Created" : "Register Library Member"}
    >
      {result ? (
        <div className="space-y-4">
          <Alert variant="success">
            Member <strong>{result.fullName}</strong> was registered
            successfully!
          </Alert>

          <div className="p-4 bg-surface-raised rounded-xl border border-border space-y-2">
            <span className="text-xs text-muted-foreground block font-medium">
              Temporary Password (give to student / member):
            </span>
            <span className="text-base font-mono font-bold text-foreground block">
              {result.temporaryPassword}
            </span>
            <p className="text-[11px] text-muted-foreground">
              The member will be prompted to choose their own password on first
              sign in.
            </p>
          </div>

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
              placeholder="e.g. Kelvin Otieno"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Member Classification *
            </label>
            <Select
              required
              value={memberTypeId}
              onChange={(e) => setMemberTypeId(e.target.value)}
              options={memberTypes.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kelvin@school.ac.ke"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Phone Number (Kenyan)
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 712 345678"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Admission / Student ID
              </label>
              <Input
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                placeholder="ADM-2026-4412"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Membership Expiry
              </label>
              <Input
                type="date"
                value={membershipExpiresAt}
                onChange={(e) => setMembershipExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Govt ID Type (Optional)
              </label>
              <Select
                value={identifierType}
                onChange={(e) => setIdentifierType(e.target.value)}
                options={[
                  { value: "", label: "None" },
                  { value: "NATIONAL_ID", label: "Kenyan National ID" },
                  { value: "PASSPORT", label: "Passport" },
                  { value: "ALIEN_ID", label: "Alien ID" },
                  { value: "OTHER", label: "Other Document" },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Govt ID Number (Optional)
              </label>
              <Input
                value={identifierValue}
                onChange={(e) => setIdentifierValue(e.target.value)}
                placeholder="e.g. 12345678"
              />
            </div>
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
              Register Member
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
