"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newParentId, setNewParentId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  // Edit Modal
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editParentId, setEditParentId] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadCategories() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        credentials: "include",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.status === 403) {
        setError("You do not have permission to view categories.");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load categories");
      }

      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const payload: { name: string; description?: string; parentId?: string } =
        {
          name: newName.trim(),
        };
      if (newDescription.trim()) payload.description = newDescription.trim();
      if (newParentId) payload.parentId = newParentId;

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create category");
      }

      setActionMessage(`Category "${data.name}" created successfully.`);
      setShowCreateModal(false);
      setNewName("");
      setNewDescription("");
      setNewParentId("");
      loadCategories();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create category",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;
    setSavingEdit(true);
    setError(null);

    try {
      const payload: {
        name: string;
        description?: string | null;
        parentId?: string | null;
      } = {
        name: editName.trim(),
        description: editDescription.trim() || null,
        parentId: editParentId || null,
      };

      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update category");
      }

      setActionMessage(`Category "${data.name}" updated successfully.`);
      setEditingCategory(null);
      loadCategories();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to update category",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(category: Category) {
    if (
      !confirm(
        `Are you sure you want to delete category "${category.name}"? Subcategories may be affected.`,
      )
    ) {
      return;
    }

    setDeletingId(category.id);
    setError(null);

    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete category");
      }

      setActionMessage(`Category "${category.name}" deleted.`);
      loadCategories();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to delete category",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat.name);
  }

  const filtered = categories.filter((c) => {
    const q = searchFilter.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      Boolean(c.description?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              ← Back to Profile
            </Link>
            <h1 className="text-lg font-bold">Categories</h1>
            <Link
              href="/catalogue"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Catalogue
            </Link>
            <Link
              href="/users"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Staff Directory
            </Link>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewName("");
              setNewDescription("");
              setNewParentId("");
              setShowCreateModal(true);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800"
          >
            + New Category
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {actionMessage && (
          <div className="mb-4 p-3 rounded-md bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-200 text-sm border border-green-200 dark:border-green-900">
            {actionMessage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-900"
          >
            {error}
          </div>
        )}

        {/* Filter bar */}
        <div className="mb-6 flex gap-2">
          <input
            type="text"
            placeholder="Filter categories by name or description..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          />
        </div>

        {/* Categories Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Loading categories...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              {searchFilter
                ? "No categories match your search."
                : "No categories yet. Click '+ New Category' to create one."}
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Category Name</th>
                  <th className="px-4 py-3 font-semibold">Parent Category</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filtered.map((cat) => (
                  <tr
                    key={cat.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {cat.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {cat.parentId ? (
                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-zinc-100 dark:bg-zinc-800 font-medium">
                          {categoryMap.get(cat.parentId) || "Parent Category"}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">
                          — Top Level —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                      {cat.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {new Date(cat.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(cat);
                          setEditName(cat.name);
                          setEditDescription(cat.description || "");
                          setEditParentId(cat.parentId || "");
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        disabled={deletingId === cat.id}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium disabled:opacity-50"
                      >
                        {deletingId === cat.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modal: Create Category */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-lg">
            <h2 className="text-lg font-bold mb-4">Create New Category</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science & Technology"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Parent Category (Optional)
                </label>
                <select
                  value={newParentId}
                  onChange={(e) => setNewParentId(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                >
                  <option value="">— None (Top-Level Category) —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of topics or disciplines..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Category */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-lg">
            <h2 className="text-lg font-bold mb-4">Edit Category</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Parent Category
                </label>
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                >
                  <option value="">— None (Top-Level Category) —</option>
                  {categories
                    .filter((c) => c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
