"use client";

import { useEffect, useState } from "react";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { Alert } from "@/components/feedback/alert";
import { Container } from "@/components/layout/container";
import { Navbar } from "@/components/layout/navbar";
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
        err instanceof Error ? err.message : "Error loading user directory",
      );
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

  async function handlePromote(user: DirectoryUser) {
    if (
      !confirm(
        `Are you sure you want to promote ${user.fullName} to Administrator?`,
      )
    ) {
      return;
    }

    try {
      await usersService.promoteUser(user.id);
      setActionMessage(`${user.fullName} has been promoted to Administrator.`);
      loadDirectory(page, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promotion failed");
    }
  }

  return (
    <div className="min-h-screen bg-surface-raised flex flex-col">
      <Navbar />

      <RequirePermission permission={PERMISSIONS.USERS_DIRECTORY_READ}>
        <main className="flex-1 py-8">
          <Container className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Staff &amp; User Directory
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage staff members, invite librarians, and administer system
                  access.
                </p>
              </div>
              <Can permission={PERMISSIONS.USERS_INVITE_LIBRARIAN}>
                <Button onClick={() => setShowLibrarianModal(true)}>
                  + Add Librarian
                </Button>
              </Can>
            </div>

            {actionMessage && <Alert variant="success">{actionMessage}</Alert>}
            {error && <Alert variant="error">{error}</Alert>}

            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search by name, email, phone, or admission number..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">Search</Button>
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                >
                  Clear
                </Button>
              )}
            </form>

            <UserDirectoryTable
              users={users}
              loading={loading}
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              onPromote={handlePromote}
            />

            <LibrarianModal
              isOpen={showLibrarianModal}
              onClose={() => setShowLibrarianModal(false)}
              onSuccess={() => {
                loadDirectory(1, search);
              }}
            />
          </Container>
        </main>
      </RequirePermission>
    </div>
  );
}
