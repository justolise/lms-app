"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
      <div className="flex items-center gap-2 pt-1">
        <input
          id="available-only-toggle"
          type="checkbox"
          checked={availableOnly}
          onChange={(e) => onAvailableOnlyChange(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <label
          htmlFor="available-only-toggle"
          className="text-xs font-medium text-foreground select-none cursor-pointer"
        >
          Show available copies only
        </label>
      </div>
    </div>
  );
}
