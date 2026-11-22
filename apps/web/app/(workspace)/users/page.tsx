"use client";

import { useEffect, useState } from "react";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LibrarianModal } from "@/features/users/components/LibrarianModal";
import { UserDirectoryTable } from "@/features/users/components/UserDirectoryTable";
import { usersService } from "@/features/users/services/users.service";
import type { DirectoryUser } from "@/features/users/types/users.types";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default function UsersDirectoryPage() {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [_total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [showLibrarianModal, setShowLibrarianModal] = useState(false);

  async function loadDirectory(targetPage = 1, searchQuery = "") {
    setLoading(true);
    setError(null);
    try {
      const data = await usersService.getDirectory(targetPage, 15, searchQuery);
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error loading staff directory",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDirectory(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  async function handlePromote(user: DirectoryUser) {
    if (
      !confirm(
        `Are you sure you want to promote "${user.fullName}" to ADMIN? This grants full system authority.`,
      )
    ) {
      return;
    }

    try {
      await usersService.promoteUser(user.id);
      setActionMessage(`"${user.fullName}" promoted to ADMIN.`);
      loadDirectory(page, search);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to promote user to admin",
      );
    }
  }

  return (
    <RequirePermission permission={PERMISSIONS.USERS_DIRECTORY_READ}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Staff &amp; User Directory
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage system administrators, librarians, and staff account
              security.
            </p>
          </div>

          <Can permission={PERMISSIONS.USERS_INVITE_LIBRARIAN}>
            <Button onClick={() => setShowLibrarianModal(true)} size="md">
              + Invite Librarian
            </Button>
          </Can>
        </div>

        {actionMessage && <Alert variant="success">{actionMessage}</Alert>}

        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-sm">
          <Input
            placeholder="Search staff by name or email..."
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
            Search
          </Button>
        </form>

        <UserDirectoryTable
          users={users}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onPromote={handlePromote}
        />

        {showLibrarianModal && (
          <LibrarianModal
            isOpen={showLibrarianModal}
            onClose={() => setShowLibrarianModal(false)}
            onSuccess={() => {
              setShowLibrarianModal(false);
              setActionMessage("Librarian invitation created.");
              loadDirectory(page, search);
            }}
          />
        )}
      </div>
    </RequirePermission>
  );
}
