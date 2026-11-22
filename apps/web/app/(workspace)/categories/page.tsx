"use client";

import { useEffect, useState } from "react";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { Alert } from "@/components/feedback/alert";
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

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  return (
    <RequirePermission permission={PERMISSIONS.CATEGORIES_READ}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Categories &amp; Classification
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage hierarchical library subject classifications and
              taxonomies.
            </p>
          </div>

          <Can permission={PERMISSIONS.CATEGORIES_MANAGE}>
            <Button
              onClick={() => {
                setEditingCategory(null);
                setShowModal(true);
              }}
              size="md"
            >
              + Add Category
            </Button>
          </Can>
        </div>

        {actionMessage && <Alert variant="success">{actionMessage}</Alert>}

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-2 max-w-sm">
          <Input
            placeholder="Filter categories by name..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            leftAddon={
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        </div>

        <CategoryTable
          categories={filteredCategories}
          loading={loading}
          onEdit={(cat) => {
            setEditingCategory(cat);
            setShowModal(true);
          }}
          onDelete={handleDelete}
        />

        {showModal && (
          <CategoryModal
            isOpen={showModal}
            editingCategory={editingCategory}
            categories={categories}
            onClose={() => {
              setShowModal(false);
              setEditingCategory(null);
            }}
            onSuccess={() => {
              setShowModal(false);
              setEditingCategory(null);
              setActionMessage("Category saved successfully.");
              loadCategories();
            }}
          />
        )}
      </div>
    </RequirePermission>
  );
}
