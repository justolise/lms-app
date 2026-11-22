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
import { membersService } from "@/features/members/services/members.service";
import { usersService } from "@/features/users/services/users.service";
import type { DirectoryUser } from "@/features/users/types/users.types";
import { PERMISSIONS } from "@/lib/auth/permissions";

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

  // Directory state
  const [members, setMembers] = useState<DirectoryUser[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

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
      const data = await usersService.getDirectory(1, 50, query);
      const patronRoles = new Set(["MEMBER", "TEACHER", "PARENT"]);
      const filtered = (data.users || []).filter((u) =>
        patronRoles.has(u.role),
      );
      setMembers(filtered);
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
              Review public membership enquiries, verify patron identification,
              and provision library accounts.
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
                placeholder="Search by patron name, phone, or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                leftAddon={
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                }
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
                  <TableHead>Role / Type</TableHead>
                  <TableHead>Contact (Email / Phone)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMembers ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading patron directory...
                    </TableCell>
                  </TableRow>
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No patrons found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium text-foreground">
                        {member.fullName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.role === "TEACHER" ? "primary" : "default"
                          }
                        >
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.email || member.phone || "—"}
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
                        {member.createdAt
                          ? new Date(member.createdAt).toLocaleDateString()
                          : "—"}
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
                isLoading={loadingEnquiries}
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
                        {new Date(enq.createdAt).toLocaleDateString()}
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
                              variant="primary"
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
      </div>
    </RequirePermission>
  );
}
