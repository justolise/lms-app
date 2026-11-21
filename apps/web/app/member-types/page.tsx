"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface LoanPolicy {
  id: string;
  itemFormat: string;
  loanDurationDays: number;
  maxConcurrentLoans: number;
  maxRenewals: number;
  gracePeriodDays: number;
  dailyFineMinorUnits: number;
  maxFineMinorUnits: number;
}

interface MemberTypeSummary {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

interface MemberTypeDetail extends MemberTypeSummary {
  policies: LoanPolicy[];
}

export default function MemberTypesPage() {
  const router = useRouter();
  const [memberTypes, setMemberTypes] = useState<MemberTypeSummary[]>([]);
  const [selectedType, setSelectedType] = useState<MemberTypeDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modal: Create Member Type
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");
  const [creatingType, setCreatingType] = useState(false);

  // Modal: Edit Member Type
  const [showEditTypeModal, setShowEditTypeModal] = useState(false);
  const [editTypeName, setEditTypeName] = useState("");
  const [editTypeDescription, setEditTypeDescription] = useState("");
  const [editTypeActive, setEditTypeActive] = useState(true);
  const [updatingType, setUpdatingType] = useState(false);

  // Modal: Add / Edit Policy
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [policyFormat, setPolicyFormat] = useState("BOOK");
  const [policyDuration, setPolicyDuration] = useState(14);
  const [policyMaxLoans, setPolicyMaxLoans] = useState(5);
  const [policyMaxRenewals, setPolicyMaxRenewals] = useState(2);
  const [policyGracePeriod, setPolicyGracePeriod] = useState(0);
  const [policyDailyFine, setPolicyDailyFine] = useState(0);
  const [policyMaxFine, setPolicyMaxFine] = useState(0);
  const [savingPolicy, setSavingPolicy] = useState(false);

  async function loadMemberTypes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/member-types", {
        credentials: "include",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.status === 403) {
        setError(
          "You do not have permission to manage member types and policies.",
        );
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load member types");
      }

      const data = await res.json();
      setMemberTypes(data);

      if (data.length > 0 && !selectedType) {
        loadTypeDetail(data[0].id);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading member types",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadTypeDetail(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/member-types/${id}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedType(data);
      }
    } catch (err: unknown) {
      console.error("Failed to load details:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadMemberTypes();
  }, []);

  async function handleCreateType(e: React.FormEvent) {
    e.preventDefault();
    setCreatingType(true);
    setError(null);

    try {
      const res = await fetch("/api/member-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newTypeName.trim(),
          description: newTypeDescription.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create member type");
      }

      setActionMessage(`Member type "${data.name}" created successfully.`);
      setShowCreateTypeModal(false);
      setNewTypeName("");
      setNewTypeDescription("");
      await loadMemberTypes();
      loadTypeDetail(data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setCreatingType(false);
    }
  }

  async function handleUpdateType(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) return;
    setUpdatingType(true);
    setError(null);

    try {
      const res = await fetch(`/api/member-types/${selectedType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editTypeName.trim(),
          description: editTypeDescription.trim() || undefined,
          isActive: editTypeActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update member type");
      }

      setActionMessage(`Member type "${data.name}" updated successfully.`);
      setShowEditTypeModal(false);
      await loadMemberTypes();
      loadTypeDetail(selectedType.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingType(false);
    }
  }

  async function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) return;
    setSavingPolicy(true);
    setError(null);

    try {
      const isEdit = Boolean(editingPolicyId);
      const url = isEdit
        ? `/api/member-types/${selectedType.id}/policies/${editingPolicyId}`
        : `/api/member-types/${selectedType.id}/policies`;
      const method = isEdit ? "PATCH" : "POST";

      const payload = isEdit
        ? {
            loanDurationDays: Number(policyDuration),
            maxConcurrentLoans: Number(policyMaxLoans),
            maxRenewals: Number(policyMaxRenewals),
            gracePeriodDays: Number(policyGracePeriod),
            dailyFineMinorUnits: Number(policyDailyFine),
            maxFineMinorUnits: Number(policyMaxFine),
          }
        : {
            itemFormat: policyFormat.trim().toUpperCase(),
            loanDurationDays: Number(policyDuration),
            maxConcurrentLoans: Number(policyMaxLoans),
            maxRenewals: Number(policyMaxRenewals),
            gracePeriodDays: Number(policyGracePeriod),
            dailyFineMinorUnits: Number(policyDailyFine),
            maxFineMinorUnits: Number(policyMaxFine),
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save loan policy");
      }

      setActionMessage(
        isEdit
          ? `Loan policy for ${policyFormat} updated.`
          : `Loan policy for ${policyFormat} added.`,
      );
      setShowPolicyModal(false);
      loadTypeDetail(selectedType.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Policy save failed");
    } finally {
      setSavingPolicy(false);
    }
  }

  async function handleDeletePolicy(policyId: string, format: string) {
    if (!selectedType) return;
    if (!confirm(`Are you sure you want to delete the ${format} loan policy?`))
      return;

    try {
      const res = await fetch(
        `/api/member-types/${selectedType.id}/policies/${policyId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete policy");
      }

      setActionMessage(`Loan policy for ${format} deleted.`);
      loadTypeDetail(selectedType.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Deletion failed");
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
            <h1 className="text-lg font-bold">Member Types &amp; Policies</h1>
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
              href="/users"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Staff Directory
            </Link>
          </div>
          <button
            onClick={() => {
              setNewTypeName("");
              setNewTypeDescription("");
              setShowCreateTypeModal(true);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800"
          >
            + New Member Type
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column: Member Types List */}
          <div className="md:col-span-1 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-3">
              Member Types
            </h2>

            {loading ? (
              <div className="text-xs text-zinc-500 py-4 text-center">
                Loading types...
              </div>
            ) : memberTypes.length === 0 ? (
              <div className="text-xs text-zinc-500 py-4 text-center">
                No member types defined yet.
              </div>
            ) : (
              <div className="space-y-1">
                {memberTypes.map((mt) => (
                  <button
                    key={mt.id}
                    onClick={() => loadTypeDetail(mt.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center justify-between ${
                      selectedType?.id === mt.id
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <div>
                      <div>{mt.name}</div>
                      {mt.description && (
                        <div
                          className={`text-xs truncate max-w-[180px] ${
                            selectedType?.id === mt.id
                              ? "text-zinc-300 dark:text-zinc-600"
                              : "text-zinc-400"
                          }`}
                        >
                          {mt.description}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        mt.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                          : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {mt.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right column: Selected Type Detail & Policies */}
          <div className="md:col-span-2 space-y-4">
            {detailLoading ? (
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-lg border border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-500">
                Loading details...
              </div>
            ) : selectedType ? (
              <>
                {/* Header card */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{selectedType.name}</h2>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          selectedType.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                            : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {selectedType.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {selectedType.description || "No description provided."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditTypeName(selectedType.name);
                      setEditTypeDescription(selectedType.description || "");
                      setEditTypeActive(selectedType.isActive);
                      setShowEditTypeModal(true);
                    }}
                    className="px-3 py-1.5 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    Edit Details
                  </button>
                </div>

                {/* Policies card */}
                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-base">
                        Borrowing &amp; Fine Policies
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Configured loan durations, renewals, and fine rates by
                        item format (ADM-2, CIR-4, FIN-1).
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingPolicyId(null);
                        setPolicyFormat("BOOK");
                        setPolicyDuration(14);
                        setPolicyMaxLoans(5);
                        setPolicyMaxRenewals(2);
                        setPolicyGracePeriod(0);
                        setPolicyDailyFine(0);
                        setPolicyMaxFine(0);
                        setShowPolicyModal(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800"
                    >
                      + Add Policy
                    </button>
                  </div>

                  {selectedType.policies.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                      No policy configured yet. Checkout will be blocked until a
                      policy exists for this member type.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedType.policies.map((p) => (
                        <div
                          key={p.id}
                          className="p-4 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                                {p.itemFormat}
                              </span>
                              <span className="text-xs text-zinc-500">
                                • {p.loanDurationDays} days loan • Max{" "}
                                {p.maxConcurrentLoans} items • {p.maxRenewals}{" "}
                                renewals
                              </span>
                            </div>
                            <div className="text-xs text-zinc-500">
                              Grace: {p.gracePeriodDays} days • Fine/day: KES{" "}
                              {(p.dailyFineMinorUnits / 100).toFixed(2)} • Cap:
                              KES {(p.maxFineMinorUnits / 100).toFixed(2)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => {
                                setEditingPolicyId(p.id);
                                setPolicyFormat(p.itemFormat);
                                setPolicyDuration(p.loanDurationDays);
                                setPolicyMaxLoans(p.maxConcurrentLoans);
                                setPolicyMaxRenewals(p.maxRenewals);
                                setPolicyGracePeriod(p.gracePeriodDays);
                                setPolicyDailyFine(p.dailyFineMinorUnits);
                                setPolicyMaxFine(p.maxFineMinorUnits);
                                setShowPolicyModal(true);
                              }}
                              className="px-2.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleDeletePolicy(p.id, p.itemFormat)
                              }
                              className="px-2.5 py-1 text-xs text-red-600 hover:text-red-700 border border-red-200 dark:border-red-900 rounded hover:bg-red-50 dark:hover:bg-red-950/50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-lg border border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-500">
                Select a member type to inspect and configure its policies.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal: Create Member Type */}
      {showCreateTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-2">Create Member Type</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Member types classify patrons (e.g. Student, Teacher, Community)
              and associate specific loan limits.
            </p>

            <form onSubmit={handleCreateType} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Type Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Student"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Standard borrowing rights for registered primary and secondary students"
                  value={newTypeDescription}
                  onChange={(e) => setNewTypeDescription(e.target.value)}
                  className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateTypeModal(false)}
                  className="px-3 py-1.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingType}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-md disabled:opacity-50"
                >
                  {creatingType ? "Creating..." : "Create Member Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Member Type */}
      {showEditTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-2">Edit Member Type</h3>

            <form onSubmit={handleUpdateType} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Type Name *
                </label>
                <input
                  type="text"
                  required
                  value={editTypeName}
                  onChange={(e) => setEditTypeName(e.target.value)}
                  className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editTypeDescription}
                  onChange={(e) => setEditTypeDescription(e.target.value)}
                  className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editTypeActive}
                  onChange={(e) => setEditTypeActive(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-medium">
                  Active (allows assigning to new members)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditTypeModal(false)}
                  className="px-3 py-1.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingType}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-md disabled:opacity-50"
                >
                  {updatingType ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Policy */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-1">
              {editingPolicyId ? "Edit Loan Policy" : "Add Loan Policy"}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Configure borrowing periods, renewal caps, and late fine rates for{" "}
              {selectedType?.name}.
            </p>

            <form onSubmit={handleSavePolicy} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Item Format *
                </label>
                <input
                  type="text"
                  disabled={Boolean(editingPolicyId)}
                  placeholder="e.g. BOOK, DVD, PERIODICAL"
                  value={policyFormat}
                  onChange={(e) =>
                    setPolicyFormat(e.target.value.toUpperCase())
                  }
                  className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 disabled:opacity-50 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Loan Days *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={policyDuration}
                    onChange={(e) => setPolicyDuration(Number(e.target.value))}
                    className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Max Loans *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={policyMaxLoans}
                    onChange={(e) => setPolicyMaxLoans(Number(e.target.value))}
                    className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Max Renewals *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={policyMaxRenewals}
                    onChange={(e) =>
                      setPolicyMaxRenewals(Number(e.target.value))
                    }
                    className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Grace Period (Days) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={policyGracePeriod}
                    onChange={(e) =>
                      setPolicyGracePeriod(Number(e.target.value))
                    }
                    className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Daily Fine (Cents/Minor Units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={policyDailyFine}
                    onChange={(e) => setPolicyDailyFine(Number(e.target.value))}
                    className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                  />
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    e.g. 1000 = KES 10.00
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Max Fine Cap (Cents)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={policyMaxFine}
                    onChange={(e) => setPolicyMaxFine(Number(e.target.value))}
                    className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                  />
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    e.g. 50000 = KES 500.00
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="px-3 py-1.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPolicy}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-md disabled:opacity-50"
                >
                  {savingPolicy ? "Saving..." : "Save Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
