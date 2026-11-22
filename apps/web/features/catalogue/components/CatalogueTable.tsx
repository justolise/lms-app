"use client";

import { Can } from "@/components/auth/can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { CatalogueItem, CategoryOption } from "../types/catalogue.types";

interface CatalogueTableProps {
  items: CatalogueItem[];
  categories: CategoryOption[];
  loading: boolean;
  onManageCopies: (item: CatalogueItem) => void;
}

export function CatalogueTable({
  items,
  categories,
  loading,
  onManageCopies,
}: CatalogueTableProps) {
  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    categoryMap.set(c.id, c.name);
  }

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
        <Spinner size="md" />
        <span className="text-sm text-muted-foreground">
          Loading catalogue...
        </span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground bg-surface rounded-xl border border-border">
        No titles match your criteria.
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-raised border-b border-border text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Title / Author</th>
              <th className="px-4 py-3 font-semibold">Format</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">ISBN</th>
              <th className="px-4 py-3 font-semibold">Copies Available</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const hasCopies = item.availableCopies > 0;
              const authorsText =
                item.authors && item.authors.length > 0
                  ? item.authors.join(", ")
                  : "Unknown Author";

              return (
                <tr
                  key={item.id}
                  className="hover:bg-surface-raised/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">
                      {item.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {authorsText}
                    </div>
                    {item.callNumber && (
                      <span className="inline-block mt-0.5 text-[11px] font-mono text-muted-foreground">
                        Call: {item.callNumber}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{item.format}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.categoryId
                      ? categoryMap.get(item.categoryId) || "—"
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {item.isbn13 || item.isbn10 || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={hasCopies ? "success" : "danger"}>
                      {item.availableCopies} / {item.totalCopies} available
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Can permission={PERMISSIONS.COPIES_MANAGE}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onManageCopies(item)}
                      >
                        Copies ({item.totalCopies})
                      </Button>
                    </Can>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
