"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "../services/auth.service";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState(
    searchParams.get("identifier") || "",
  );
  const [otp, setOtp] = useState("");
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
      await authService.resetPassword(identifier, otp, newPassword);
      router.push(
        "/login?message=Password%20reset%20successfully.%20Please%20sign%20in.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <Input
        label="Account Email or Phone"
        required
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        placeholder="user@school.ac.ke or 07..."
      />

      <Input
        label="6-Digit Verification Code"
        required
        maxLength={8}
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="123456"
        className="tracking-widest font-mono text-center text-lg"
      />

      <Input
        label="New Password (min 8 characters)"
        type="password"
        required
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="••••••••"
      />

      <Input
        label="Confirm New Password"
        type="password"
        required
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
        Reset Password
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Back to{" "}
        <Link
          href="/login"
          className="text-primary hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
