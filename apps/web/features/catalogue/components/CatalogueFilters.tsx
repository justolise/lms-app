"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/utils/classnames";
import { type CategoryOption, ITEM_FORMATS } from "../types/catalogue.types";

interface CatalogueFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  formatFilter: string;
  onFormatChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  availableOnly: boolean;
  onAvailableOnlyChange: (value: boolean) => void;
  categories: CategoryOption[];
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
}

export function CatalogueFilters({
  searchQuery,
  onSearchChange,
  formatFilter,
  onFormatChange,
  categoryFilter,
  onCategoryChange,
  availableOnly,
  onAvailableOnlyChange,
  categories,
  viewMode = "grid",
  onViewModeChange,
}: CatalogueFiltersProps) {
  const formatOptions = [
    { value: "", label: "All Formats" },
    ...ITEM_FORMATS.map((f) => ({ value: f, label: f })),
  ];

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="bg-surface rounded-xl border border-border p-4 shadow-sm space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <Input
            placeholder="Search by title, author, ISBN..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div>
          <Select
            options={formatOptions}
            value={formatFilter}
            onChange={(e) => onFormatChange(e.target.value)}
          />
        </div>
        <div>
          <Select
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/60">
        <div className="flex items-center gap-2">
          <input
            id="available-only-toggle"
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => onAvailableOnlyChange(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
          <label
            htmlFor="available-only-toggle"
            className="text-xs font-medium text-foreground select-none cursor-pointer"
          >
            Show available copies only
          </label>
        </div>

        {/* View Mode Toggle (Card/Grid vs List) */}
        {onViewModeChange && (
          <div className="flex items-center gap-1 bg-surface-raised p-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface",
              )}
              title="Card / Grid View"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface",
              )}
              title="List View"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <span>List</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
