"use client";

import { useEffect, useState } from "react";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { Alert } from "@/components/feedback/alert";
import { Container } from "@/components/layout/container";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryModal } from "@/features/categories/components/CategoryModal";
import { CategoryTable } from "@/features/categories/components/CategoryTable";
import { categoriesService } from "@/features/categories/services/categories.service";
import type { Category } from "@/features/categories/types/categories.types";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  async function loadCategories() {
    setLoading(true);
    setError(null);
    try {
      const data = await categoriesService.list();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleDelete(category: Category) {
    if (
      !confirm(
        `Are you sure you want to delete category "${category.name}"? Subcategories may be affected.`,
      )
    ) {
      return;
    }

    try {
      await categoriesService.delete(category.id);
      setActionMessage(`Category "${category.name}" deleted.`);
      loadCategories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete category",
      );
    }
  }

  const filtered = categories.filter((c) => {
    const q = searchFilter.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      Boolean(c.description?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-surface-raised flex flex-col">
      <Navbar />

      <RequirePermission permission={PERMISSIONS.CATEGORIES_READ}>
        <main className="flex-1 py-8">
          <Container className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Categories
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Organize catalogue items into a structured classification
                  hierarchy.
                </p>
              </div>
              <Can permission={PERMISSIONS.CATEGORIES_MANAGE}>
                <Button
                  onClick={() => {
                    setEditingCategory(null);
                    setShowModal(true);
                  }}
                >
                  + New Category
                </Button>
              </Can>
            </div>

            {actionMessage && <Alert variant="success">{actionMessage}</Alert>}
            {error && <Alert variant="error">{error}</Alert>}

            <div>
              <Input
                placeholder="Filter categories by name or description..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            <CategoryTable
              categories={filtered}
              loading={loading}
              onEdit={(cat) => {
                setEditingCategory(cat);
                setShowModal(true);
              }}
              onDelete={handleDelete}
            />

            <CategoryModal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              onSuccess={() => {
                setActionMessage(
                  editingCategory
                    ? "Category updated successfully."
                    : "Category created successfully.",
                );
                loadCategories();
              }}
              categories={categories}
              editingCategory={editingCategory}
            />
          </Container>
        </main>
      </RequirePermission>
    </div>
  );
}
