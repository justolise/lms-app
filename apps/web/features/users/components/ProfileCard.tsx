"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/utils/date";
import { usersService } from "../services/users.service";
import type { UserProfile } from "../types/users.types";

interface ProfileCardProps {
  profile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onDeactivateClick: () => void;
}

export function ProfileCard({
  profile,
  onProfileUpdated,
  onDeactivateClick,
}: ProfileCardProps) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await usersService.updateProfile({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      onProfileUpdated(updated);
      setEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-6">
      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {profile.fullName}
          </h2>
          <p className="text-xs text-muted-foreground">
            Member since {formatDate(profile.createdAt)}
          </p>
          {profile.tenantName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <span>🏛️</span>
              <span className="font-medium text-foreground">
                {profile.tenantName}
              </span>
              <Link
                href="/library-info"
                className="text-primary hover:underline ml-1"
              >
                (View Library Details)
              </Link>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary">{profile.role}</Badge>
          <Badge variant={profile.status === "ACTIVE" ? "success" : "danger"}>
            {profile.status}
          </Badge>
        </div>
      </div>

      {!editing ? (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-muted-foreground block">Email</span>
              <span className="font-medium text-foreground">
                {profile.email || "Not specified"}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Phone</span>
              <span className="font-medium text-foreground">
                {profile.phone || "Not specified"}
              </span>
            </div>
            {profile.profile?.admissionNumber && (
              <div>
                <span className="text-xs text-muted-foreground block">
                  Admission Number
                </span>
                <span className="font-mono font-medium text-foreground">
                  {profile.profile.admissionNumber}
                </span>
              </div>
            )}
            {profile.profile?.memberType && (
              <div>
                <span className="text-xs text-muted-foreground block">
                  Member Type
                </span>
                <span className="font-medium text-foreground">
                  {profile.profile.memberType}
                </span>
              </div>
            )}
            {profile.profile?.group && (
              <div>
                <span className="text-xs text-muted-foreground block">
                  Class / Group
                </span>
                <span className="font-medium text-foreground">
                  {profile.profile.group}
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditing(true)}
              >
                Edit Profile
              </Button>
              <Link href="/change-password">
                <Button size="sm" variant="outline">
                  Change Password
                </Button>
              </Link>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDeactivateClick}
              className="text-danger hover:text-danger hover:bg-danger/10"
            >
              Deactivate Account
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Full Name *
            </label>
            <Input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Phone
            </label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFullName(profile.fullName);
                setEmail(profile.email || "");
                setPhone(profile.phone || "");
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={saving}>
              Save Profile
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
