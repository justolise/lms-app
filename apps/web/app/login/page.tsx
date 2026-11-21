"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LibraryOption {
  tenantId: string;
  tenantName: string;
  role: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [identifierType, setIdentifierType] = useState<"EMAIL" | "PHONE">(
    "EMAIL",
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [libraries, setLibraries] = useState<LibraryOption[] | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: identifierType,
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Invalid credentials");
      }

      if (data.requiresLibrarySelection) {
        setLibraries(data.memberships);
        if (data.memberships.length > 0) {
          setSelectedTenantId(data.memberships[0].tenantId);
        }
        return;
      }

      if (data.user?.mustChangePassword) {
        router.push("/change-password?firstLogin=true");
      } else {
        router.push("/profile");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectMembership(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTenantId) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/select-membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tenantId: selectedTenantId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to select library");
      }

      if (data.user?.mustChangePassword) {
        router.push("/change-password?firstLogin=true");
      } else {
        router.push("/profile");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Selection failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Library Management System
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to your library account
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-zinc-900 py-8 px-6 shadow-sm rounded-lg sm:px-10 border border-zinc-200 dark:border-zinc-800">
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-900"
            >
              {error}
            </div>
          )}

          {!libraries ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Sign in using
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setIdentifierType("EMAIL")}
                    className={`py-2 px-3 text-sm font-medium rounded-md border text-center transition-colors ${
                      identifierType === "EMAIL"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent"
                        : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Email Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdentifierType("PHONE")}
                    className={`py-2 px-3 text-sm font-medium rounded-md border text-center transition-colors ${
                      identifierType === "PHONE"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent"
                        : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Phone (Kenya)
                  </button>
                </div>

                <label
                  htmlFor="identifier"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {identifierType === "EMAIL"
                    ? "Email Address"
                    : "Phone Number (e.g. 0712345678)"}
                </label>
                <input
                  id="identifier"
                  type={identifierType === "EMAIL" ? "email" : "tel"}
                  required
                  autoComplete={identifierType === "EMAIL" ? "email" : "tel"}
                  placeholder={
                    identifierType === "EMAIL"
                      ? "user@example.com"
                      : "0712345678 or +254712345678"
                  }
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 sm:text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 sm:text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 transition-colors"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSelectMembership} className="space-y-4">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Select Library
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
                Your credentials match multiple library memberships. Please
                choose which library to access:
              </p>
              <div className="space-y-2">
                {libraries.map((lib) => (
                  <label
                    key={lib.tenantId}
                    className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedTenantId === lib.tenantId
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800/50"
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="tenantId"
                        value={lib.tenantId}
                        checked={selectedTenantId === lib.tenantId}
                        onChange={() => setSelectedTenantId(lib.tenantId)}
                        className="text-zinc-900 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                      />
                      <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                        {lib.tenantName}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                      {lib.role}
                    </span>
                  </label>
                ))}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setLibraries(null)}
                  className="flex-1 py-2 px-3 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-3 rounded-md shadow-sm text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {loading ? "Loading..." : "Continue"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
