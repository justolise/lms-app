"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/lib/auth/auth-context";
import { authService } from "../services/auth.service";
import type { IdentifierType, LibraryMembership } from "../types/auth.types";

export function LoginForm() {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshProfile } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect whether the identifier is email or phone
  const detectedType: IdentifierType | null = (() => {
    const trimmed = identifier.trim();
    if (!trimmed) return null;
    if (trimmed.includes("@")) return "EMAIL";
    if (/^[+0-9]/.test(trimmed)) return "PHONE";
    if (/[a-zA-Z]/.test(trimmed)) return "EMAIL";
    return "PHONE";
  })();

  // If already authenticated, redirect directly to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  // Multi-library membership selection state
  const [memberships, setMemberships] = useState<LibraryMembership[] | null>(
    null,
  );
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [selecting, setSelecting] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const type: IdentifierType =
        detectedType ?? (identifier.includes("@") ? "EMAIL" : "PHONE");

      const data = await authService.login(type, identifier, password);

      if (
        data.requiresLibrarySelection &&
        data.memberships &&
        data.memberships.length > 0
      ) {
        setMemberships(data.memberships);
        setSelectedTenantId(data.memberships[0].tenantId);
        return;
      }

      await refreshProfile();

      if (data.user?.mustChangePassword) {
        router.replace("/change-password?firstLogin=true");
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid credentials. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectMembership(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTenantId) return;

    setError(null);
    setSelecting(true);

    try {
      const data = await authService.selectMembership(selectedTenantId);

      await refreshProfile();

      if (data.user?.mustChangePassword) {
        router.replace("/change-password?firstLogin=true");
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to select library.",
      );
    } finally {
      setSelecting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleLogin} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label="Email or Phone Number"
          type="text"
          required
          autoComplete="username"
          placeholder="e.g. librarian@school.ac.ke or 0712345678"
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

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-foreground">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={loading}
        >
          Sign in
        </Button>
      </form>

      {/* Multi-membership selection modal */}
      {memberships && (
        <Modal
          isOpen={true}
          onClose={() => setMemberships(null)}
          title="Select Your Library"
          description="Your account is associated with multiple libraries. Choose which one to enter."
        >
          <form onSubmit={handleSelectMembership} className="space-y-4">
            <div className="space-y-2">
              {memberships.map((m) => (
                <label
                  key={m.tenantId}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTenantId === m.tenantId
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="tenantSelection"
                      value={m.tenantId}
                      checked={selectedTenantId === m.tenantId}
                      onChange={(e) => setSelectedTenantId(e.target.value)}
                      className="text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {m.tenantName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {m.tenantId.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <Badge variant={m.role === "ADMIN" ? "primary" : "muted"}>
                    {m.role}
                  </Badge>
                </label>
              ))}
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={selecting}
            >
              Enter Library
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
