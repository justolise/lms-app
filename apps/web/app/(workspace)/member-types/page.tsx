"use client";

import { useEffect, useState } from "react";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { Alert } from "@/components/feedback/alert";
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
        err instanceof Error ? err.message : "Error loading member types",
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
          : "Error loading member type details",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadMemberTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectType(type: MemberTypeSummary) {
    loadDetail(type.id);
  }

  return (
    <RequirePermission permission={PERMISSIONS.MEMBER_TYPES_READ}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Member Types &amp; Policy Matrix
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure borrower groups, circulation rules, loan durations, and
              overdue fines.
            </p>
          </div>

          <Can permission={PERMISSIONS.MEMBER_TYPES_MANAGE}>
            <Button
              onClick={() => {
                setEditingType(null);
                setShowTypeModal(true);
              }}
              size="md"
            >
              + Add Member Type
            </Button>
          </Can>
        </div>

        {actionMessage && <Alert variant="success">{actionMessage}</Alert>}

        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <MemberTypeList
              memberTypes={types}
              selectedId={selectedType?.id ?? null}
              loading={loading}
              onSelect={handleSelectType}
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
              onAddPolicy={() => {
                setEditingPolicy(null);
                setShowPolicyModal(true);
              }}
              onEditPolicy={(policy) => {
                setEditingPolicy(policy);
                setShowPolicyModal(true);
              }}
            />
          </div>
        </div>

        {showTypeModal && (
          <MemberTypeModal
            isOpen={showTypeModal}
            editingType={editingType}
            onClose={() => {
              setShowTypeModal(false);
              setEditingType(null);
            }}
            onSuccess={() => {
              setShowTypeModal(false);
              setEditingType(null);
              setActionMessage("Member type saved.");
              loadMemberTypes();
            }}
          />
        )}

        {showPolicyModal && selectedType && (
          <PolicyModal
            isOpen={showPolicyModal}
            memberTypeId={selectedType.id}
            editingPolicy={editingPolicy}
            onClose={() => {
              setShowPolicyModal(false);
              setEditingPolicy(null);
            }}
            onSuccess={() => {
              setShowPolicyModal(false);
              setEditingPolicy(null);
              setActionMessage("Loan policy updated.");
              loadDetail(selectedType.id);
            }}
          />
        )}
      </div>
    </RequirePermission>
  );
}
