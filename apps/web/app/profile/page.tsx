"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  profile?: {
    admissionNumber?: string;
    memberType?: string;
    group?: string;
    membershipExpiresAt?: string;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Deactivation confirmation modal
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile", {
        credentials: "include",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load profile");
      }

      const data = await res.json();
      setProfile(data);
      setEditFullName(data.fullName || "");
      setEditEmail(data.email || "");
      setEditPhone(data.phone || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: editFullName.trim(),
          email: editEmail.trim() || undefined,
          phone: editPhone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      setProfile((prev) => (prev ? { ...prev, ...data } : null));
      setEditing(false);
      setSuccessMessage("Profile updated successfully");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    setDeactivating(true);
    setDeactivateError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to deactivate account");
      }

      router.push("/login?message=Account%20deactivated");
    } catch (err: unknown) {
      setDeactivateError(
        err instanceof Error ? err.message : "Deactivation failed",
      );
    } finally {
      setDeactivating(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          Loading your profile...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">LMS Portal</h1>
            <Link
              href="/catalogue"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Catalogue
            </Link>
            <Link
              href="/categories"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Categories
            </Link>
            {profile &&
              (profile.role === "ADMIN" || profile.role === "LIBRARIAN") && (
                <Link
                  href="/users"
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Staff Directory
                </Link>
              )}
            {profile && profile.role === "ADMIN" && (
              <Link
                href="/member-types"
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Member Types &amp; Policies
              </Link>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {successMessage && (
          <div className="mb-4 p-3 rounded-md bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-200 text-sm border border-green-200 dark:border-green-900">
            {successMessage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-900"
          >
            {error}
          </div>
        )}

        {profile && (
          <div className="space-y-6">
            {/* Profile Overview */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Account Details</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 font-semibold rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    {profile.role}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 font-semibold rounded ${
                      profile.status === "ACTIVE"
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    }`}
                  >
                    {profile.status}
                  </span>
                </div>
              </div>

              {!editing ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Full Name:
                    </span>{" "}
                    <span className="font-medium">{profile.fullName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Email:
                    </span>{" "}
                    <span className="font-medium">
                      {profile.email || "None"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Phone:
                    </span>{" "}
                    <span className="font-medium">
                      {profile.phone || "None"}
                    </span>
                  </div>
                  {profile.profile && (
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                      <h3 className="font-semibold text-xs text-zinc-500 uppercase tracking-wider">
                        Membership Info
                      </h3>
                      {profile.profile.admissionNumber && (
                        <div>
                          <span className="text-zinc-500 dark:text-zinc-400">
                            Admission No:
                          </span>{" "}
                          <span className="font-medium">
                            {profile.profile.admissionNumber}
                          </span>
                        </div>
                      )}
                      {profile.profile.memberType && (
                        <div>
                          <span className="text-zinc-500 dark:text-zinc-400">
                            Member Type:
                          </span>{" "}
                          <span className="font-medium">
                            {profile.profile.memberType}
                          </span>
                        </div>
                      )}
                      {profile.profile.group && (
                        <div>
                          <span className="text-zinc-500 dark:text-zinc-400">
                            Class/Group:
                          </span>{" "}
                          <span className="font-medium">
                            {profile.profile.group}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 flex gap-3">
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      Edit Profile Details
                    </button>
                    <Link
                      href="/change-password"
                      className="px-4 py-2 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-center"
                    >
                      Change Password
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-md disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Account Deactivation Danger Zone */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-red-200 dark:border-red-950 shadow-sm">
              <h2 className="text-base font-bold text-red-700 dark:text-red-400 mb-2">
                Deactivate Account
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Deactivating your account will suspend your access and revoke
                all active login sessions immediately. Historical borrowing and
                transaction records are safely preserved according to library
                policy.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeactivateError(null);
                  setShowDeactivateModal(true);
                }}
                className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-950/50"
              >
                Deactivate My Account
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Confirm Account Deactivation
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to deactivate your account? You will be
              signed out of all devices immediately.
            </p>

            {deactivateError && (
              <div className="mt-3 p-3 rounded-md bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-900">
                {deactivateError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                disabled={deactivating}
                className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivating}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {deactivating ? "Deactivating..." : "Yes, Deactivate Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
