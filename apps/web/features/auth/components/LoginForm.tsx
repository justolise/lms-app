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
  const [identifierType, setIdentifierType] = useState<IdentifierType>("EMAIL");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const data = await authService.login(
        identifierType,
        identifier,
        password,
      );

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

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Sign in using
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
          autoComplete={identifierType === "EMAIL" ? "email" : "tel"}
          placeholder={
            identifierType === "EMAIL"
              ? "librarian@school.ac.ke"
              : "0712345678 or +254..."
          }
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
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
