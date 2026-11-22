"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "../services/auth.service";

export function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstLogin = searchParams.get("firstLogin") === "true";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await authService.changePassword(
        newPassword,
        isFirstLogin ? undefined : currentPassword,
      );
      router.push("/profile?message=Password%20updated%20successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to change password.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isFirstLogin && (
        <Alert variant="info" title="Initial Password Setup">
          This is your first time signing in. For security, please choose a
          permanent password before continuing.
        </Alert>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {!isFirstLogin && (
        <Input
          label="Current Password"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="••••••••"
        />
      )}

      <Input
        label="New Password"
        type="password"
        required
        autoComplete="new-password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Min. 8 characters"
      />

      <Input
        label="Confirm New Password"
        type="password"
        required
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="••••••••"
      />

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        isLoading={loading}
      >
        {isFirstLogin ? "Set Permanent Password & Continue" : "Update Password"}
      </Button>
    </form>
  );
}
