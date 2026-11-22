"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { authService } from "../services/auth.service";
import { PasswordMatchBar } from "./PasswordMatchBar";
import { PasswordRequirements } from "./PasswordRequirements";

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

    const hasComplexity =
      /[a-z]/.test(newPassword) &&
      /[A-Z]/.test(newPassword) &&
      /\d/.test(newPassword) &&
      /[^a-zA-Z\d]/.test(newPassword);

    if (!hasComplexity) {
      setError(
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.",
      );
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
        <PasswordInput
          label="Current Password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="••••••••"
        />
      )}

      <div className="space-y-2">
        <PasswordInput
          label="New Password"
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Min. 8 characters"
        />
        {newPassword && <PasswordRequirements password={newPassword} />}
      </div>

      <div className="space-y-2">
        <PasswordInput
          label="Confirm New Password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
        />
        <PasswordMatchBar
          password={newPassword}
          confirmPassword={confirmPassword}
        />
      </div>

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
