"use client";

import { useEffect, useState } from "react";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateMemberModal } from "@/features/members/components/CreateMemberModal";
import { EditMemberModal } from "@/features/members/components/EditMemberModal";
import { MemberHistoryModal } from "@/features/members/components/MemberHistoryModal";
import { membersService } from "@/features/members/services/members.service";
import type { MemberDirectoryItem } from "@/features/members/types/members.types";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDate } from "@/utils/date";

interface MembershipEnquiry {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  memberType: string | null;
  organization: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

export default function MembersDeskPage() {
  const [activeTab, setActiveTab] = useState<"directory" | "enquiries">(
    "directory",
  );

  // Directory state (MEM-1)
  const [members, setMembers] = useState<MemberDirectoryItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Edit and history modals state
  const [editingMember, setEditingMember] =
    useState<MemberDirectoryItem | null>(null);
  const [viewingHistoryMember, setViewingHistoryMember] =
    useState<MemberDirectoryItem | null>(null);

  // Enquiries state
  const [enquiries, setEnquiries] = useState<MembershipEnquiry[]>([]);
  const [loadingEnquiries, setLoadingEnquiries] = useState(false);

  // Common state
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Provisioning modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [prefilledValues, setPrefilledValues] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
  }>({});
  const [activeEnquiryId, setActiveEnquiryId] = useState<string | null>(null);

  async function loadMembers(query = "") {
    setLoadingMembers(true);
    setError(null);
    try {
      const data = await membersService.listMembers({ search: query });
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading patrons");
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadEnquiries() {
    setLoadingEnquiries(true);
    setError(null);
    try {
      const data = await membersService.listEnquiries();
      setEnquiries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading enquiries");
    } finally {
      setLoadingEnquiries(false);
    }
  }

  useEffect(() => {
    if (activeTab === "directory") {
      loadMembers(search);
    } else {
      loadEnquiries();
    }
  }, [activeTab, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleProvisionFromEnquiry = (enquiry: MembershipEnquiry) => {
    setPrefilledValues({
      fullName: enquiry.fullName,
      email: enquiry.email || "",
      phone: enquiry.phone,
    });
    setActiveEnquiryId(enquiry.id);
    setShowCreateModal(true);
  };

  const handleMarkReviewed = async (enquiryId: string) => {
    try {
      await membersService.reviewEnquiry(enquiryId, "REVIEWED");
      setActionMessage("Enquiry marked as reviewed.");
      loadEnquiries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update enquiry");
    }
  };

  return (
    <RequirePermission permission={PERMISSIONS.MEMBERS_READ}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Patrons &amp; Memberships Desk
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage member profiles, view borrowing history, and review public
              membership applications (MEM-1, MEM-4).
            </p>
          </div>

          <Can permission={PERMISSIONS.MEMBERS_CREATE}>
            <Button
              onClick={() => {
                setPrefilledValues({});
                setActiveEnquiryId(null);
                setShowCreateModal(true);
              }}
              size="md"
            >
              + Register New Patron
            </Button>
          </Can>
        </div>

        {/* Tab Switcher */}
        <div className="border-b border-border flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "directory"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Patron Directory ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("enquiries")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "enquiries"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Public Membership Enquiries</span>
            {enquiries.filter((e) => e.status === "PENDING").length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-bold">
                {enquiries.filter((e) => e.status === "PENDING").length} pending
              </span>
            )}
          </button>
        </div>

        {actionMessage && <Alert variant="success">{actionMessage}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}

        {/* ─── TAB 1: PATRON DIRECTORY ────────────────────────────────────────── */}
        {activeTab === "directory" && (
          <div className="space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
              <Input
                placeholder="Search by name, admission #, phone, or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Button type="submit" variant="secondary">
                Filter
              </Button>
              {search && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setSearchInput("");
                  }}
                >
                  Clear
                </Button>
              )}
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patron Name</TableHead>
                  <TableHead>Admission / ID #</TableHead>
                  <TableHead>Member Type</TableHead>
                  <TableHead>Contact Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMembers ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground text-xs"
                    >
                      Loading patron directory...
                    </TableCell>
                  </TableRow>
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground text-xs"
                    >
                      No patrons found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-semibold text-foreground text-xs">
                        {member.fullName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {member.admissionNumber || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="primary" className="text-[11px]">
                          {member.memberTypeName || "Standard"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>{member.phone || "No phone"}</div>
                        {member.email && (
                          <div className="text-[11px]">{member.email}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.status === "ACTIVE" ? "success" : "danger"
                          }
                        >
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(member.createdAt)}
                      </TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingHistoryMember(member)}
                        >
                          History
                        </Button>
                        <Can permission={PERMISSIONS.MEMBERS_CREATE}>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingMember(member)}
                          >
                            Edit
                          </Button>
                        </Can>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ─── TAB 2: PUBLIC MEMBERSHIP ENQUIRIES ─────────────────────────────── */}
        {activeTab === "enquiries" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Enquiries submitted via the public library portal. Review patron
                contact details and verify identification before creating
                accounts.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadEnquiries}
                disabled={loadingEnquiries}
              >
                Refresh
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Applicant Name</TableHead>
                  <TableHead>Contact (Email / Phone)</TableHead>
                  <TableHead>Category / Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingEnquiries ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading membership enquiries...
                    </TableCell>
                  </TableRow>
                ) : enquiries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No membership enquiries found for this library.
                    </TableCell>
                  </TableRow>
                ) : (
                  enquiries.map((enq) => (
                    <TableRow key={enq.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(enq.createdAt)}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        <div>{enq.fullName}</div>
                        {enq.notes && (
                          <div className="text-[11px] text-muted-foreground font-normal line-clamp-1 max-w-xs">
                            &ldquo;{enq.notes}&rdquo;
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">
                          {enq.phone}
                        </div>
                        {enq.email && (
                          <div className="text-muted-foreground">
                            {enq.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {enq.memberType && (
                          <Badge
                            variant="muted"
                            className="text-[10px] uppercase"
                          >
                            {enq.memberType}
                          </Badge>
                        )}
                        {enq.organization && (
                          <div className="text-muted-foreground text-[11px] mt-0.5">
                            {enq.organization}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            enq.status === "PENDING"
                              ? "warning"
                              : enq.status === "APPROVED"
                                ? "success"
                                : "muted"
                          }
                        >
                          {enq.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {enq.status === "PENDING" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8"
                              onClick={() => handleMarkReviewed(enq.id)}
                            >
                              Mark Reviewed
                            </Button>
                          )}
                          <Can permission={PERMISSIONS.MEMBERS_CREATE}>
                            <Button
                              size="sm"
                              className="text-xs h-8"
                              onClick={() => handleProvisionFromEnquiry(enq)}
                            >
                              Provision Account
                            </Button>
                          </Can>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Provision Member Account Modal */}
        {showCreateModal && (
          <CreateMemberModal
            isOpen={showCreateModal}
            initialValues={prefilledValues}
            onClose={() => {
              setShowCreateModal(false);
              setPrefilledValues({});
              setActiveEnquiryId(null);
            }}
            onSuccess={() => {
              setShowCreateModal(false);
              setActionMessage("Patron card successfully provisioned.");
              if (activeEnquiryId) {
                membersService.reviewEnquiry(activeEnquiryId, "APPROVED");
              }
              setPrefilledValues({});
              setActiveEnquiryId(null);
              if (activeTab === "directory") {
                loadMembers(search);
              } else {
                loadEnquiries();
              }
            }}
          />
        )}

        {/* Edit Member Profile Modal (MEM-1) */}
        {editingMember && (
          <EditMemberModal
            isOpen={!!editingMember}
            member={editingMember}
            onClose={() => setEditingMember(null)}
            onUpdated={() => {
              setActionMessage("Member profile updated successfully.");
              loadMembers(search);
            }}
          />
        )}

        {/* Member Borrowing History Modal (MEM-4) */}
        {viewingHistoryMember && (
          <MemberHistoryModal
            isOpen={!!viewingHistoryMember}
            member={viewingHistoryMember}
            onClose={() => setViewingHistoryMember(null)}
          />
        )}
      </div>
    </RequirePermission>
  );
}
