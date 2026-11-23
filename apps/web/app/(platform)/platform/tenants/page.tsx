"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  libraryCode: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  adminCount: number;
}

function TenantsDirectoryContent() {
  const searchParams = useSearchParams();
  const shouldOpenOnboard = searchParams.get("onboard") === "true";

  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Onboarding Modal State
  const [isModalOpen, setIsModalOpen] = useState(shouldOpenOnboard);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [libraryCode, setLibraryCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [onboardingNotes, setOnboardingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  async function loadTenants() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<
        { items: TenantItem[]; meta?: unknown } | TenantItem[]
      >(ENDPOINTS.platform.tenants);

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];

      setTenants(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTenants();
  }, []);

  function handleNameChange(val: string) {
    setName(val);
    // Auto-generate slug from name if not manually edited
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generatedSlug);
  }

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    setModalError(null);

    if (!slug.match(/^[a-z0-9-]+$/)) {
      setModalError(
        "Slug must contain only lowercase letters, numbers, and hyphens.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(ENDPOINTS.platform.tenants, {
        name: name.trim(),
        slug: slug.trim(),
        libraryCode: libraryCode.trim().toUpperCase(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        onboardingNotes: onboardingNotes.trim() || undefined,
      });

      setIsModalOpen(false);
      setName("");
      setSlug("");
      setLibraryCode("");
      setEmail("");
      setPhone("");
      setOnboardingNotes("");
      setActionSuccess(`Tenant "${name}" successfully onboarded.`);
      loadTenants();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Failed to onboard tenant",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(tenant: TenantItem) {
    const newStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const confirmMsg =
      newStatus === "SUSPENDED"
        ? `Are you sure you want to suspend "${tenant.name}"? Staff and patrons will be locked out and active sessions revoked.`
        : `Reactivate "${tenant.name}"? Staff will be permitted to sign in.`;

    if (!confirm(confirmMsg)) return;

    try {
      await apiClient.patch(ENDPOINTS.platform.tenantStatus(tenant.id), {
        status: newStatus,
        reason: "Administrator toggle via platform console",
      });
      setActionSuccess(`Tenant "${tenant.name}" is now ${newStatus}.`);
      loadTenants();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update tenant status",
      );
    }
  }

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      t.libraryCode.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Library Tenants
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Provision, inspect, and configure multi-tenant school and community
            libraries
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setModalError(null);
            setIsModalOpen(true);
          }}
          className="text-xs shrink-0"
        >
          + Onboard New Tenant
        </Button>
      </div>

      {actionSuccess && <Alert variant="success">{actionSuccess}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by name, slug or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-muted-foreground">
            Status:
          </span>
          {["ALL", "ACTIVE", "SUSPENDED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === st
                  ? "bg-forest-800 text-white font-semibold"
                  : "bg-surface text-muted-foreground hover:bg-surface-hover border border-border"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No library tenants found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-hover border-b border-border text-muted-foreground">
                  <th className="p-3 font-semibold">Library Name</th>
                  <th className="p-3 font-semibold">Slug (Path)</th>
                  <th className="p-3 font-semibold">Code</th>
                  <th className="p-3 font-semibold">Admins</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Created</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTenants.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-surface-hover/60 transition-colors"
                  >
                    <td className="p-3">
                      <Link
                        href={`/platform/tenants/${t.id}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {t.name}
                      </Link>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">
                      /libraries/{t.slug}
                    </td>
                    <td className="p-3 font-mono font-bold text-foreground">
                      {t.libraryCode}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {t.adminCount} provisioned
                    </td>
                    <td className="p-3">
                      {t.status === "ACTIVE" ? (
                        <Badge variant="success" className="text-[10px]">
                          ACTIVE
                        </Badge>
                      ) : (
                        <Badge variant="danger" className="text-[10px]">
                          SUSPENDED
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/platform/tenants/${t.id}`}>
                          <Button
                            variant="outline"
                            className="text-xs h-7 px-2"
                          >
                            Manage
                          </Button>
                        </Link>
                        <Button
                          variant={t.status === "ACTIVE" ? "danger" : "primary"}
                          className="text-xs h-7 px-2"
                          onClick={() => handleToggleStatus(t)}
                        >
                          {t.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Onboard New Tenant Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Onboard New Library Tenant"
        >
          <form onSubmit={handleCreateTenant} className="space-y-4 text-xs">
            {modalError && <Alert variant="error">{modalError}</Alert>}

            <Input
              label="Library / School Name *"
              required
              placeholder="e.g. Westlands Community Library"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="URL Slug (Unique Path) *"
                required
                placeholder="e.g. westlands-library"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                helperText="Lowercase letters, numbers, and hyphens only."
              />
              <Input
                label="Library Code (3-10 chars) *"
                required
                placeholder="e.g. WCL01"
                value={libraryCode}
                onChange={(e) => setLibraryCode(e.target.value.toUpperCase())}
                helperText="Unique uppercase prefix for member cards."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Contact Email"
                type="email"
                placeholder="librarian@westlands.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Contact Phone"
                placeholder="+254 712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block font-medium text-foreground">
                Onboarding &amp; Contract Notes (Internal)
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
                placeholder="Institutional tier, contracted branches, donor program..."
                value={onboardingNotes}
                onChange={(e) => setOnboardingNotes(e.target.value)}
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Create &amp; Provision Tenant
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function PlatformTenantsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground">
          Loading tenants...
        </div>
      }
    >
      <TenantsDirectoryContent />
    </Suspense>
  );
}
