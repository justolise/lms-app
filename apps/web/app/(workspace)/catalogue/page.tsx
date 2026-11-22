"use client";

import { useEffect, useState } from "react";
import { Can } from "@/components/auth/can";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { BookModal } from "@/features/catalogue/components/BookModal";
import { CatalogueFilters } from "@/features/catalogue/components/CatalogueFilters";
import { CatalogueTable } from "@/features/catalogue/components/CatalogueTable";
import { CopiesModal } from "@/features/catalogue/components/CopiesModal";
import { catalogueService } from "@/features/catalogue/services/catalogue.service";
import type {
  CatalogueItem,
  CategoryOption,
} from "@/features/catalogue/types/catalogue.types";
import { categoriesService } from "@/features/categories/services/categories.service";
import { PlaceHoldModal } from "@/features/holds/components/PlaceHoldModal";
import type { Hold } from "@/features/holds/types/holds.types";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default function CataloguePage() {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogueItem | null>(null);
  const [selectedItemForCopies, setSelectedItemForCopies] =
    useState<CatalogueItem | null>(null);
  const [holdItem, setHoldItem] = useState<CatalogueItem | null>(null);

  async function loadCategories() {
    try {
      const data = await categoriesService.list();
      setCategories(data.map((c) => ({ id: c.id, name: c.name })));
    } catch {
      // Non-blocking
    }
  }

  async function loadCatalogue() {
    setLoading(true);
    setError(null);
    try {
      const data = await catalogueService.list({
        q: searchQuery,
        format: formatFilter || undefined,
        categoryId: categoryFilter || undefined,
        availableOnly,
      });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading catalogue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadCatalogue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, formatFilter, categoryFilter, availableOnly]);

  async function handleArchive(item: CatalogueItem) {
    if (!confirm(`Are you sure you want to archive "${item.title}"?`)) {
      return;
    }
    try {
      await catalogueService.archive(item.id);
      setActionMessage(`"${item.title}" has been archived.`);
      loadCatalogue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive book");
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Catalogue Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search titles, manage inventory copies, print barcodes, and reserve
            books.
          </p>
        </div>

        <Can permission={PERMISSIONS.CATALOGUE_CREATE}>
          <Button onClick={() => setShowAddModal(true)} size="md">
            + Add New Title
          </Button>
        </Can>
      </div>

      {actionMessage && <Alert variant="success">{actionMessage}</Alert>}

      {error && <Alert variant="error">{error}</Alert>}

      {/* Filter Toolbar */}
      <CatalogueFilters
        searchQuery={searchQuery}
        formatFilter={formatFilter}
        categoryFilter={categoryFilter}
        availableOnly={availableOnly}
        categories={categories}
        onSearchChange={setSearchQuery}
        onFormatChange={setFormatFilter}
        onCategoryChange={setCategoryFilter}
        onAvailableOnlyChange={setAvailableOnly}
      />

      {/* Catalogue Grid / Table */}
      <CatalogueTable
        items={items}
        categories={categories}
        loading={loading}
        onEditItem={(item: CatalogueItem) => setEditingItem(item)}
        onManageCopies={(item: CatalogueItem) => setSelectedItemForCopies(item)}
        onArchiveItem={handleArchive}
        onPlaceHold={(item: CatalogueItem) => setHoldItem(item)}
      />

      {/* Add Book Modal */}
      {showAddModal && (
        <BookModal
          isOpen={showAddModal}
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            setActionMessage("New book successfully added.");
            loadCatalogue();
          }}
        />
      )}

      {/* Edit Book Modal */}
      {editingItem && (
        <BookModal
          isOpen={!!editingItem}
          editingItem={editingItem}
          categories={categories}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            setActionMessage(`"${editingItem.title}" updated successfully.`);
            loadCatalogue();
          }}
        />
      )}

      {/* Manage Copies Modal */}
      {selectedItemForCopies && (
        <CopiesModal
          isOpen={!!selectedItemForCopies}
          item={selectedItemForCopies}
          onClose={() => setSelectedItemForCopies(null)}
          onCopiesChanged={() => loadCatalogue()}
        />
      )}

      {/* Place Hold Modal */}
      {holdItem && (
        <PlaceHoldModal
          isOpen={!!holdItem}
          item={holdItem}
          onClose={() => setHoldItem(null)}
          onSuccess={(_hold: Hold) => {
            setHoldItem(null);
            setActionMessage(
              `Hold placed successfully on "${holdItem.title}".`,
            );
            loadCatalogue();
          }}
        />
      )}
    </div>
  );
}
