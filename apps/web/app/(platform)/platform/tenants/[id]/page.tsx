"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  libraryCode: string;
  status: "ACTIVE" | "SUSPENDED";
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  onboardingNotes?: string | null;
  createdAt: string;
}

interface TenantAdmin {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
}

function TenantDetailContent() {
  const params = useParams<{ id: string }>();
  const _router = useRouter();
  const tenantId = params?.id;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [admins, setAdmins] = useState<TenantAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Admin Provisioning State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  async function loadData() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [tenantData, adminsData] = await Promise.all([
        apiClient.get<TenantDetail>(ENDPOINTS.platform.tenant(tenantId)),
        apiClient.get<TenantAdmin[]>(ENDPOINTS.platform.tenantAdmins(tenantId)),
      ]);
      setTenant(tenantData);
      setAdmins(Array.isArray(adminsData) ? adminsData : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tenant details",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  async function handleProvisionAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setProvisionError(null);
    setIsProvisioning(true);

    try {
      await apiClient.post(ENDPOINTS.platform.tenantAdmins(tenantId), {
        fullName: adminName.trim(),
        email: adminEmail.trim(),
        phone: adminPhone.trim() || undefined,
        password: adminPassword || undefined,
      });

      setIsProvisionModalOpen(false);
      setAdminName("");
      setAdminEmail("");
      setAdminPhone("");
      setAdminPassword("");
      setActionSuccess(`Administrator account created for ${adminEmail}.`);
      loadData();
    } catch (err) {
      setProvisionError(
        err instanceof Error
          ? err.message
          : "Failed to provision administrator",
      );
    } finally {
      setIsProvisioning(false);
    }
  }

  async function handleResetPassword(admin: TenantAdmin) {
    if (!tenantId) return;
    const newPassword = prompt(
      `Enter new temporary password for ${admin.fullName} (${admin.email}):`,
    );
    if (!newPassword || newPassword.length < 8) {
      if (newPassword !== null)
        alert("Password must be at least 8 characters long.");
      return;
    }

    try {
      await apiClient.post(
        ENDPOINTS.platform.tenantAdminResetPassword(tenantId, admin.id),
        { newPassword },
      );
      setActionSuccess(
        `Password reset for ${admin.fullName}. All active sessions revoked.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    }
  }

  async function handleToggleStatus() {
    if (!tenant) return;
    const newStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`))
      return;

    try {
      await apiClient.patch(ENDPOINTS.platform.tenantStatus(tenant.id), {
        status: newStatus,
        reason: "Platform Super Admin console toggle",
      });
      setActionSuccess(`Tenant status updated to ${newStatus}.`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-sm text-muted-foreground">
          Tenant not found or has been deleted.
        </p>
        <Link href="/platform/tenants">
          <Button variant="outline" className="text-xs">
            &larr; Return to Tenant Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/platform/tenants"
              className="text-xs text-muted-foreground hover:underline"
            >
              &larr; All Tenants
            </Link>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-mono font-bold text-foreground">
              {tenant.slug}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            {tenant.name}
            {tenant.status === "ACTIVE" ? (
              <Badge variant="success">ACTIVE</Badge>
            ) : (
              <Badge variant="danger">SUSPENDED</Badge>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={tenant.status === "ACTIVE" ? "danger" : "primary"}
            onClick={handleToggleStatus}
            className="text-xs"
          >
            {tenant.status === "ACTIVE"
              ? "Suspend Tenant"
              : "Reactivate Tenant"}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setProvisionError(null);
              setIsProvisionModalOpen(true);
            }}
            className="text-xs"
          >
            + Provision Admin
          </Button>
        </div>
      </div>

      {actionSuccess && <Alert variant="success">{actionSuccess}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-foreground">
              Institutional Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">
                  Library Code Prefix:
                </span>
                <p className="font-mono font-bold text-foreground text-sm mt-0.5">
                  {tenant.libraryCode}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Public URL Route:</span>
                <p className="font-mono text-primary mt-0.5">
                  /libraries/{tenant.slug}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <span className="text-muted-foreground">
                  Primary Contact Email:
                </span>
                <p className="text-foreground mt-0.5">
                  {tenant.email || "None specified"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Primary Contact Phone:
                </span>
                <p className="text-foreground mt-0.5">
                  {tenant.phone || "None specified"}
                </p>
              </div>
            </div>

            {tenant.onboardingNotes && (
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground">Onboarding Notes:</span>
                <p className="text-foreground mt-0.5 whitespace-pre-wrap">
                  {tenant.onboardingNotes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-foreground">
              Tenant Lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="text-muted-foreground">Provisioned Date:</span>
              <p className="text-foreground font-semibold mt-0.5">
                {new Date(tenant.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Tenant UUID:</span>
              <p className="font-mono text-[11px] text-muted-foreground break-all mt-0.5">
                {tenant.id}
              </p>
            </div>
            <div className="pt-2 border-t border-border text-muted-foreground">
              Suspended tenants immediately block member loans, returns, and
              staff login desk access.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provisioned Administrators Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            Tenant Administrators ({admins.length})
          </h2>
          <Button
            variant="outline"
            className="text-xs"
            onClick={() => {
              setProvisionError(null);
              setIsProvisionModalOpen(true);
            }}
          >
            + Add Another Admin
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {admins.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <p>No tenant administrators provisioned yet.</p>
              <Button
                variant="primary"
                className="text-xs"
                onClick={() => setIsProvisionModalOpen(true)}
              >
                Provision Initial Admin Now
              </Button>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-hover border-b border-border text-muted-foreground">
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Phone</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Created</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-surface-hover/60">
                    <td className="p-3 font-semibold text-foreground">
                      {adm.fullName}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {adm.email || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {adm.phone || "—"}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={adm.status === "ACTIVE" ? "success" : "muted"}
                        className="text-[10px]"
                      >
                        {adm.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(adm.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        className="text-xs h-7 px-2"
                        onClick={() => handleResetPassword(adm)}
                      >
                        Reset Password
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Provision Admin Modal */}
      {isProvisionModalOpen && (
        <Modal
          isOpen={isProvisionModalOpen}
          onClose={() => setIsProvisionModalOpen(false)}
          title={`Provision Admin for ${tenant.name}`}
        >
          <form onSubmit={handleProvisionAdmin} className="space-y-4 text-xs">
            {provisionError && <Alert variant="error">{provisionError}</Alert>}

            <Input
              label="Admin Full Legal Name *"
              required
              placeholder="e.g. Grace Wanjiku"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
            />

            <Input
              label="Admin Email Address *"
              type="email"
              required
              placeholder="grace@library.org"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />

            <Input
              label="Admin Phone Number (Optional)"
              placeholder="+254 711 000 000"
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
            />

            <Input
              label="Initial Password (Optional, leave blank to auto-generate)"
              type="password"
              placeholder="Min. 8 characters"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              helperText="The user will be required to change their password on initial login."
            />

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProvisionModalOpen(false)}
                disabled={isProvisioning}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isProvisioning}
              >
                Provision Admin Account
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function TenantDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      <TenantDetailContent />
    </Suspense>
  );
}
