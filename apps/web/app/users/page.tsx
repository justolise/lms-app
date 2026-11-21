"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface DirectoryUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  admissionNumber?: string;
  memberType?: string;
  group?: string;
}

export default function UsersDirectoryPage() {
  const router = useRouter();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // New Librarian Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLibName, setNewLibName] = useState("");
  const [newLibEmail, setNewLibEmail] = useState("");
  const [newLibPhone, setNewLibPhone] = useState("");
  const [creatingLib, setCreatingLib] = useState(false);
  const [createLibResult, setCreateLibResult] = useState<{
    temporaryPassword?: string;
    fullName?: string;
  } | null>(null);

  async function loadDirectory(targetPage = 1, searchQuery = "") {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: "15",
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/users?${params.toString()}`, {
        credentials: "include",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.status === 403) {
        setError("You do not have permission to view the staff directory.");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load user directory");
      }

      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDirectory(page, search);
  }, [page, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  async function handlePromote(userId: string, userName: string) {
    if (
      !confirm(`Are you sure you want to promote ${userName} to Administrator?`)
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}/promote`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to promote user");
      }

      setActionMessage(`${userName} has been promoted to Administrator.`);
      loadDirectory(page, search);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Promotion failed");
    }
  }

  async function handleCreateLibrarian(e: React.FormEvent) {
    e.preventDefault();
    setCreatingLib(true);
    setError(null);

    try {
      const res = await fetch("/api/users/librarians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: newLibName.trim(),
          email: newLibEmail.trim() || undefined,
          phone: newLibPhone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create librarian");
      }

      setCreateLibResult({
        fullName: data.fullName,
        temporaryPassword: data.temporaryPassword,
      });
      loadDirectory(1, search);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setCreatingLib(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              ← Back to Profile
            </Link>
            <h1 className="text-lg font-bold">Staff User Directory</h1>
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
            <Link
              href="/member-types"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Member Types &amp; Policies
            </Link>
          </div>
          <button
            onClick={() => {
              setCreateLibResult(null);
              setNewLibName("");
              setNewLibEmail("");
              setNewLibPhone("");
              setShowCreateModal(true);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800"
          >
            + New Librarian
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {actionMessage && (
          <div className="mb-4 p-3 rounded-md bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-200 text-sm border border-green-200 dark:border-green-900">
            {actionMessage}
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

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <input
            type="text"
            placeholder="Search by name, email, phone, or admission number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
              className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md"
            >
              Clear
            </button>
          )}
        </form>

        {/* Users Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Loading directory...
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No users found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Member Details</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {u.fullName}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {u.email || u.phone || "No contact"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-medium">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            u.status === "ACTIVE"
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                        {u.admissionNumber && (
                          <div>Adm: {u.admissionNumber}</div>
                        )}
                        {u.memberType && <div>Type: {u.memberType}</div>}
                        {u.group && <div>Group: {u.group}</div>}
                        {!u.admissionNumber && !u.memberType && !u.group && "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.role === "LIBRARIAN" && u.status === "ACTIVE" && (
                          <button
                            onClick={() => handlePromote(u.id, u.fullName)}
                            className="text-xs px-2.5 py-1 font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                          >
                            Promote to Admin
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <div>
              Total: {total} {total === 1 ? "user" : "users"} (Page {page} of{" "}
              {totalPages})
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-zinc-300 dark:border-zinc-700 rounded disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-zinc-300 dark:border-zinc-700 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Create Librarian Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-2">Create Librarian Account</h3>
            <p className="text-xs text-zinc-500 mb-4">
              A temporary password will be generated automatically and must be
              changed on first login.
            </p>

            {createLibResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/50 rounded-md border border-green-200 dark:border-green-900 text-sm">
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Librarian Created Successfully
                  </p>
                  <p className="mt-1 text-xs text-green-800 dark:text-green-200">
                    Share this temporary password with{" "}
                    {createLibResult.fullName}. It will not be shown again.
                  </p>
                  <div className="mt-3 p-2 bg-white dark:bg-zinc-900 rounded border border-green-300 dark:border-green-800 font-mono text-center text-sm font-bold select-all">
                    {createLibResult.temporaryPassword}
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-md text-sm font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateLibrarian} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newLibName}
                    onChange={(e) => setNewLibName(e.target.value)}
                    className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newLibEmail}
                    onChange={(e) => setNewLibEmail(e.target.value)}
                    className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Kenyan Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 0712345678"
                    value={newLibPhone}
                    onChange={(e) => setNewLibPhone(e.target.value)}
                    className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingLib}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-md disabled:opacity-50"
                  >
                    {creatingLib ? "Creating..." : "Create Account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
