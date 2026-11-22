"use client";

import { Can } from "@/components/auth/can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDate } from "@/utils/date";
import type { DirectoryUser } from "../types/users.types";

interface UserDirectoryTableProps {
  users: DirectoryUser[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPromote: (user: DirectoryUser) => void;
}

export function UserDirectoryTable({
  users,
  loading,
  page,
  totalPages,
  onPageChange,
  onPromote,
}: UserDirectoryTableProps) {
  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
        <Spinner size="md" />
        <span className="text-sm text-muted-foreground">Loading users...</span>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground bg-surface rounded-xl border border-border">
        No users match your criteria.
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-raised border-b border-border text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-surface-raised/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-foreground">
                    {user.fullName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user.email || user.phone || "No contact info"}
                  </div>
                  {user.admissionNumber && (
                    <div className="text-[11px] font-mono text-muted-foreground">
                      Adm: {user.admissionNumber}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="primary">{user.role}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={user.status === "ACTIVE" ? "success" : "danger"}
                  >
                    {user.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {user.role !== "ADMIN" && (
                    <Can permission={PERMISSIONS.USERS_PROMOTE}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onPromote(user)}
                      >
                        Promote to Admin
                      </Button>
                    </Can>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
