"use client";

import { useEffect, useState } from "react";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { Alert } from "@/components/feedback/alert";
import { Container } from "@/components/layout/container";
import { Navbar } from "@/components/layout/navbar";
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
  const [selectedItemForCopies, setSelectedItemForCopies] =
    useState<CatalogueItem | null>(null);

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
      setError(err instanceof Error ? err.message : "Failed to load catalogue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadCatalogue();
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery, formatFilter, categoryFilter, availableOnly]);

  return (
    <div className="min-h-screen bg-surface-raised flex flex-col">
      <Navbar />

      <RequirePermission permission={PERMISSIONS.CATALOGUE_READ}>
        <main className="flex-1 py-8">
          <Container className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Library Catalogue
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browse titles, check copy availability, or register new
                  physical inventory.
                </p>
              </div>
              <Can permission={PERMISSIONS.CATALOGUE_CREATE}>
                <Button onClick={() => setShowAddModal(true)}>
                  + Add Title
                </Button>
              </Can>
            </div>

            {actionMessage && <Alert variant="success">{actionMessage}</Alert>}
            {error && <Alert variant="error">{error}</Alert>}

            <CatalogueFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              formatFilter={formatFilter}
              onFormatChange={setFormatFilter}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              availableOnly={availableOnly}
              onAvailableOnlyChange={setAvailableOnly}
              categories={categories}
            />

            <CatalogueTable
              items={items}
              categories={categories}
              loading={loading}
              onManageCopies={(item) => setSelectedItemForCopies(item)}
            />

            <BookModal
              isOpen={showAddModal}
              onClose={() => setShowAddModal(false)}
              onSuccess={() => {
                setActionMessage("Title added to catalogue successfully.");
                loadCatalogue();
              }}
              categories={categories}
            />

            <CopiesModal
              item={selectedItemForCopies}
              isOpen={Boolean(selectedItemForCopies)}
              onClose={() => setSelectedItemForCopies(null)}
              onCopiesChanged={() => loadCatalogue()}
            />
          </Container>
        </main>
      </RequirePermission>
    </div>
  );
}
