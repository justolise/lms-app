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
import { usersService } from "@/features/users/services/users.service";
import type { DirectoryUser } from "@/features/users/types/users.types";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default function MembersDeskPage() {
  const [members, setMembers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function loadMembers(query = "") {
    setLoading(true);
    setError(null);
    try {
      const data = await usersService.getDirectory(1, 50, query);
      // Filter patrons/members (MEMBER, TEACHER, PARENT)
      const patronRoles = new Set(["MEMBER", "TEACHER", "PARENT"]);
      const filtered = (data.users || []).filter((u) =>
        patronRoles.has(u.role),
      );
      setMembers(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading patrons");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers(search);
  }, [search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <RequirePermission permission={PERMISSIONS.MEMBERS_READ}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Patron Directory &amp; Memberships
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Verify patron credentials, view borrowing standing, and provision
              new library cards.
            </p>
          </div>

          <Can permission={PERMISSIONS.MEMBERS_CREATE}>
            <Button onClick={() => setShowCreateModal(true)} size="md">
              + Register New Patron
            </Button>
          </Can>
        </div>

        {actionMessage && <Alert variant="success">{actionMessage}</Alert>}

        {error && <Alert variant="error">{error}</Alert>}

        {/* Search Bar */}
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

        {/* Members Table */}
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
            {loading ? (
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

        {/* Create Member Modal */}
        {showCreateModal && (
          <CreateMemberModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              setActionMessage("Patron successfully provisioned.");
              loadMembers(search);
            }}
          />
        )}
      </div>
    </RequirePermission>
  );
}
