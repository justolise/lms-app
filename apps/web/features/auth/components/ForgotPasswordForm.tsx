"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "../services/auth.service";
import type { IdentifierType } from "../types/auth.types";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [identifierType, setIdentifierType] = useState<IdentifierType>("EMAIL");
  const [identifier, setIdentifier] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authService.requestPasswordReset(identifierType, identifier);
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to request reset OTP.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Check your device">
          If an account exists for {identifier}, a verification code has been
          sent. Use it below to set a new password.
        </Alert>

        <Button
          variant="primary"
          className="w-full"
          onClick={() =>
            router.push(
              `/reset-password?identifier=${encodeURIComponent(identifier)}`,
            )
          }
        >
          Enter Verification Code →
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Didn&apos;t receive code?{" "}
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-primary hover:underline font-medium"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Send reset code via
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIdentifierType("EMAIL")}
            className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
              identifierType === "EMAIL"
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border text-muted-foreground hover:bg-surface-hover"
            }`}
          >
            Email Address
          </button>
          <button
            type="button"
            onClick={() => setIdentifierType("PHONE")}
            className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
              identifierType === "PHONE"
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border text-muted-foreground hover:bg-surface-hover"
            }`}
          >
            Kenyan Phone
          </button>
        </div>
      </div>

      <Input
        label={identifierType === "EMAIL" ? "Email Address" : "Phone Number"}
        type={identifierType === "EMAIL" ? "email" : "tel"}
        required
        placeholder={
          identifierType === "EMAIL" ? "user@school.ac.ke" : "0712345678"
        }
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        isLoading={loading}
      >
        Send Verification Code
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Remember your password?{" "}
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
