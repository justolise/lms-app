"use client";

import { useState } from "react";
import { Can } from "@/components/auth/can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { cn } from "@/utils/classnames";
import type { CatalogueItem, CategoryOption } from "../types/catalogue.types";

interface CatalogueTableProps {
  items: CatalogueItem[];
  categories: CategoryOption[];
  loading: boolean;
  viewMode?: "grid" | "list";
  onManageCopies: (item: CatalogueItem) => void;
  onEditItem?: (item: CatalogueItem) => void;
  onArchiveItem?: (item: CatalogueItem) => void;
  onPlaceHold?: (item: CatalogueItem) => void;
}

function BookCoverThumbnail({
  coverUrl,
  isbn,
  title,
  size = "md",
}: {
  coverUrl?: string | null;
  isbn?: string | null;
  title: string;
  size?: "md" | "lg";
}) {
  const [error, setError] = useState(false);

  // Fallback to Open Library Covers API if no coverUrl was explicitly entered
  const cleanIsbn = isbn?.replace(/[-\s]/g, "").trim();
  const effectiveCoverUrl =
    coverUrl ||
    (cleanIsbn
      ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-${size === "lg" ? "L" : "M"}.jpg?default=false`
      : null);

  if (effectiveCoverUrl && !error) {
    return (
      <div
        className={cn(
          "relative rounded-md overflow-hidden bg-muted/40 border border-border shadow-xs shrink-0 flex items-center justify-center",
          size === "lg" ? "w-full aspect-2/3 max-h-52" : "w-11 h-15",
        )}
      >
        {/* biome-ignore lint/performance/noImgElement: External dynamic book cover URL */}
        <img
          src={effectiveCoverUrl}
          alt={title}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md bg-forest-900/10 dark:bg-forest-900/30 border border-border flex flex-col items-center justify-center text-primary font-bold shadow-xs shrink-0 p-1 text-center select-none",
        size === "lg" ? "w-full aspect-2/3 max-h-52" : "w-11 h-15",
      )}
    >
      <svg
        className={cn(
          size === "lg" ? "h-8 w-8 mb-1" : "h-5 w-5",
          "text-primary/60",
        )}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
      {size === "lg" && (
        <span className="text-[10px] text-muted-foreground font-medium line-clamp-1 px-1">
          {title}
        </span>
      )}
    </div>
  );
}

export function CatalogueTable({
  items,
  categories,
  loading,
  viewMode = "grid",
  onManageCopies,
  onEditItem,
  onArchiveItem,
  onPlaceHold,
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

  // ─── Card / Grid Form ──────────────────────────────────────────────────────────
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => {
          const hasCopies = item.availableCopies > 0;
          const authorsText =
            item.authors && item.authors.length > 0
              ? item.authors.join(", ")
              : "Unknown Author";
          const categoryName = item.categoryId
            ? categoryMap.get(item.categoryId)
            : null;
          const isbn = item.isbn13 || item.isbn10;

          return (
            <Card
              key={item.id}
              className="flex flex-col h-full hover:shadow-md transition-shadow duration-200 border-border group overflow-hidden"
            >
              {/* Cover Image Banner */}
              <div className="relative p-3 bg-surface-raised flex items-center justify-center border-b border-border">
                <BookCoverThumbnail
                  coverUrl={item.coverUrl}
                  isbn={item.isbn13 || item.isbn10}
                  title={item.title}
                  size="lg"
                />
                <div className="absolute top-2 left-2">
                  <Badge
                    variant="default"
                    className="text-[10px] uppercase font-semibold"
                  >
                    {item.format}
                  </Badge>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge
                    variant={hasCopies ? "success" : "danger"}
                    className="text-[10px]"
                  >
                    {item.availableCopies} / {item.totalCopies} left
                  </Badge>
                </div>
              </div>

              {/* Card Body */}
              <CardContent className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                <div className="space-y-1">
                  <h3
                    className="font-bold text-sm text-foreground line-clamp-2"
                    title={item.title}
                  >
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {item.subtitle}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    by {authorsText}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                    {categoryName && (
                      <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium">
                        {categoryName}
                      </span>
                    )}
                    {isbn && (
                      <span className="font-mono text-[10px] truncate">
                        ISBN: {isbn}
                      </span>
                    )}
                  </div>
                  {item.callNumber && (
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      Call: {item.callNumber}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-border space-y-1.5">
                  {!hasCopies && onPlaceHold && (
                    <Can permission={PERMISSIONS.HOLDS_PLACE}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs"
                        onClick={() => onPlaceHold(item)}
                      >
                        Place Hold
                      </Button>
                    </Can>
                  )}

                  <div className="flex items-center gap-1.5 w-full">
                    <Can permission={PERMISSIONS.COPIES_MANAGE}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 text-xs"
                        onClick={() => onManageCopies(item)}
                      >
                        Copies ({item.totalCopies})
                      </Button>
                    </Can>

                    {onEditItem && (
                      <Can permission={PERMISSIONS.CATALOGUE_EDIT}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => onEditItem(item)}
                        >
                          Edit
                        </Button>
                      </Can>
                    )}

                    {onArchiveItem && (
                      <Can permission={PERMISSIONS.CATALOGUE_ARCHIVE}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onArchiveItem(item)}
                          className="text-xs text-danger hover:text-danger hover:bg-danger/10 px-2"
                          title="Archive title"
                        >
                          Archive
                        </Button>
                      </Can>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // ─── List Form ────────────────────────────────────────────────────────────────
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
                    <div className="flex items-center gap-3">
                      <BookCoverThumbnail
                        coverUrl={item.coverUrl}
                        isbn={item.isbn13 || item.isbn10}
                        title={item.title}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground line-clamp-1">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {item.subtitle}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {authorsText}
                        </div>
                        {item.callNumber && (
                          <span className="inline-block mt-0.5 text-[11px] font-mono text-muted-foreground">
                            Call: {item.callNumber}
                          </span>
                        )}
                      </div>
                    </div>
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
                    <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                      {/* Place Hold — shown when no copies available */}
                      {!hasCopies && onPlaceHold && (
                        <Can permission={PERMISSIONS.HOLDS_PLACE}>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onPlaceHold(item)}
                          >
                            Place Hold
                          </Button>
                        </Can>
                      )}

                      <Can permission={PERMISSIONS.COPIES_MANAGE}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onManageCopies(item)}
                        >
                          Copies ({item.totalCopies})
                        </Button>
                      </Can>

                      {onEditItem && (
                        <Can permission={PERMISSIONS.CATALOGUE_EDIT}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditItem(item)}
                          >
                            Edit
                          </Button>
                        </Can>
                      )}

                      {onArchiveItem && (
                        <Can permission={PERMISSIONS.CATALOGUE_ARCHIVE}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onArchiveItem(item)}
                            className="text-danger hover:text-danger hover:bg-danger/10"
                          >
                            Archive
                          </Button>
                        </Can>
                      )}
                    </div>
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
