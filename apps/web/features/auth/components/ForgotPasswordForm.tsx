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
  const [identifier, setIdentifier] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectedType: IdentifierType | null = (() => {
    const trimmed = identifier.trim();
    if (!trimmed) return null;
    if (trimmed.includes("@")) return "EMAIL";
    if (/^[+0-9]/.test(trimmed)) return "PHONE";
    if (/[a-zA-Z]/.test(trimmed)) return "EMAIL";
    return "PHONE";
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const type: IdentifierType =
        detectedType ?? (identifier.includes("@") ? "EMAIL" : "PHONE");
      await authService.requestPasswordReset(type, identifier);
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

      <Input
        label="Email or Phone Number"
        type="text"
        required
        autoComplete="username"
        placeholder="e.g. user@school.ac.ke or 0712345678"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        leftAddon={
          detectedType === "EMAIL" ? (
            <svg
              className="h-4 w-4 text-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          ) : detectedType === "PHONE" ? (
            <svg
              className="h-4 w-4 text-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 text-muted-foreground transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          )
        }
        rightAddon={
          detectedType ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-primary/10 text-primary">
              {detectedType === "EMAIL" ? "Email" : "Phone"}
            </span>
          ) : null
        }
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
