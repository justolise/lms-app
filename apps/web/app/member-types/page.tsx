"use client";

import { useEffect, useState } from "react";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { Alert } from "@/components/feedback/alert";
import { Container } from "@/components/layout/container";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { MemberTypeList } from "@/features/member-types/components/MemberTypeList";
import { MemberTypeModal } from "@/features/member-types/components/MemberTypeModal";
import { PolicyMatrixTable } from "@/features/member-types/components/PolicyMatrixTable";
import { PolicyModal } from "@/features/member-types/components/PolicyModal";
import { memberTypesService } from "@/features/member-types/services/member-types.service";
import type {
  LoanPolicy,
  MemberTypeDetail,
  MemberTypeSummary,
} from "@/features/member-types/types/member-types.types";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default function MemberTypesPage() {
  const [types, setTypes] = useState<MemberTypeSummary[]>([]);
  const [selectedType, setSelectedType] = useState<MemberTypeDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modals
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<MemberTypeSummary | null>(
    null,
  );

  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LoanPolicy | null>(null);

  async function loadMemberTypes() {
    setLoading(true);
    setError(null);
    try {
      const data = await memberTypesService.list();
      setTypes(data);
      if (data.length > 0 && !selectedType) {
        loadDetail(data[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load member types",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setDetailLoading(true);
    try {
      const data = await memberTypesService.getById(id);
      setSelectedType(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load member type detail",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadMemberTypes();
  }, []);

  return (
    <div className="min-h-screen bg-surface-raised flex flex-col">
      <Navbar />

      <RequirePermission permission={PERMISSIONS.MEMBER_TYPES_READ}>
        <main className="flex-1 py-8">
          <Container className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Member Types &amp; Circulation Policies
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure borrower classifications and granular loan
                  durations, renewals, and fine caps per format.
                </p>
              </div>
              <Can permission={PERMISSIONS.MEMBER_TYPES_MANAGE}>
                <Button
                  onClick={() => {
                    setEditingType(null);
                    setShowTypeModal(true);
                  }}
                >
                  + Create Member Type
                </Button>
              </Can>
            </div>

            {actionMessage && <Alert variant="success">{actionMessage}</Alert>}
            {error && <Alert variant="error">{error}</Alert>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-1 space-y-3">
                <h2 className="text-sm font-bold text-foreground">
                  Member Classifications
                </h2>
                <MemberTypeList
                  memberTypes={types}
                  selectedId={selectedType?.id || null}
                  loading={loading}
                  onSelect={(type) => loadDetail(type.id)}
                  onEdit={(type) => {
                    setEditingType(type);
                    setShowTypeModal(true);
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <PolicyMatrixTable
                  detail={selectedType}
                  loading={detailLoading}
                  onEditPolicy={(policy) => {
                    setEditingPolicy(policy);
                    setShowPolicyModal(true);
                  }}
                  onAddPolicy={() => {
                    setEditingPolicy(null);
                    setShowPolicyModal(true);
                  }}
                />
              </div>
            </div>

            <MemberTypeModal
              isOpen={showTypeModal}
              onClose={() => setShowTypeModal(false)}
              editingType={editingType}
              onSuccess={(id) => {
                setActionMessage(
                  editingType
                    ? "Member type updated successfully."
                    : "Member type created successfully.",
                );
                loadMemberTypes();
                if (id) loadDetail(id);
              }}
            />

            {selectedType && (
              <PolicyModal
                memberTypeId={selectedType.id}
                isOpen={showPolicyModal}
                onClose={() => setShowPolicyModal(false)}
                editingPolicy={editingPolicy}
                onSuccess={() => {
                  setActionMessage("Loan policy saved successfully.");
                  loadDetail(selectedType.id);
                }}
              />
            )}
          </Container>
        </main>
      </RequirePermission>
    </div>
  );
}
