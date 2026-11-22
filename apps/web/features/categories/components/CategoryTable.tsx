"use client";

import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDate } from "@/utils/date";
import type { Category } from "../types/categories.types";

interface CategoryTableProps {
  categories: Category[];
  loading: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryTable({
  categories,
  loading,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat.name);
  }

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
        <Spinner size="md" />
        <span className="text-sm text-muted-foreground">
          Loading categories...
        </span>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground bg-surface rounded-xl border border-border">
        No categories found.
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-raised border-b border-border text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Category Name</th>
              <th className="px-4 py-3 font-semibold">Parent Category</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((cat) => (
              <tr
                key={cat.id}
                className="hover:bg-surface-raised/50 transition-colors"
              >
                <td className="px-4 py-3 font-semibold text-foreground">
                  {cat.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {cat.parentId
                    ? categoryMap.get(cat.parentId) || "—"
                    : "— (Root)"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {cat.description || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatDate(cat.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Can permission={PERMISSIONS.CATEGORIES_MANAGE}>
                    <div className="inline-flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(cat)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(cat)}
                        className="text-danger hover:text-danger hover:bg-danger/10"
                      >
                        Delete
                      </Button>
                    </div>
                  </Can>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
