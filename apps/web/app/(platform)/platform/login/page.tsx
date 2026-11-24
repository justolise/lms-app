"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ComonPlaceLogo } from "@/components/brand/comonplace-logo";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

interface LoginSuccessResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

interface MfaRequiredResponse {
  mfaRequired: true;
  tempToken: string;
}

export default function PlatformLoginPage() {
  const router = useRouter();

  // Step 1 State (Credentials)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 State (TOTP MFA)
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Submit email & password
  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiClient.post<
        LoginSuccessResponse | MfaRequiredResponse
      >(ENDPOINTS.platform.login, {
        email: email.trim(),
        password,
      });

      if ("mfaRequired" in res && res.mfaRequired) {
        setTempToken(res.tempToken);
        setIsMfaStep(true);
      } else {
        if ("accessToken" in res && typeof res.accessToken === "string") {
          localStorage.setItem("lms_platform_access_token", res.accessToken);
        }
        if ("refreshToken" in res && typeof res.refreshToken === "string") {
          localStorage.setItem("lms_platform_refresh_token", res.refreshToken);
        }
        router.push("/platform");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  }

  // Step 2: Submit 6-digit TOTP MFA code
  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiClient.post<{
        success: boolean;
        accessToken?: string;
        refreshToken?: string;
      }>(ENDPOINTS.platform.mfaVerify, {
        tempToken,
        code: totpCode.trim(),
      });

      if (res?.accessToken) {
        localStorage.setItem("lms_platform_access_token", res.accessToken);
      }
      if (res?.refreshToken) {
        localStorage.setItem("lms_platform_refresh_token", res.refreshToken);
      }

      router.push("/platform");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid authentication code. Please check your authenticator app.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2 flex flex-col items-center">
          <ComonPlaceLogo variant="mark" size="lg" />
          <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            Platform Administration
          </h1>
          <p className="text-xs text-muted-foreground">
            Restricted access for ComonPlace Platform Super Administrators
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          {!isMfaStep ? (
            /* Step 1: Email & Password Form */
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <Input
                label="Super Admin Email"
                type="email"
                required
                autoComplete="email"
                placeholder="superadmin@comonplace.co.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />

              <PasswordInput
                label="Password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                Sign In to Platform
              </Button>
            </form>
          ) : (
            /* Step 2: TOTP Verification Form */
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="rounded-lg bg-forest-50 dark:bg-forest-900/30 p-3 text-xs text-forest-800 dark:text-forest-200 border border-forest-100 dark:border-forest-800">
                <p className="font-semibold mb-1">
                  Two-Factor Authentication Required
                </p>
                <p>
                  Enter the 6-digit verification code from your authenticator
                  application (Google Authenticator, Authy, etc.).
                </p>
              </div>

              <Input
                label="6-Digit Verification Code"
                type="text"
                required
                autoFocus
                maxLength={8}
                placeholder="123456"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                disabled={isLoading}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/3"
                  onClick={() => {
                    setIsMfaStep(false);
                    setTotpCode("");
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-2/3"
                  isLoading={isLoading}
                >
                  Verify &amp; Continue
                </Button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Unauthorized attempts to access this system are strictly monitored and
          logged under Kenyan cybercrime law.
        </p>
      </div>
    </div>
  );
}
