"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface CategoryOption {
  id: string;
  name: string;
}

interface CopyItem {
  id: string;
  barcode: string;
  condition: "NEW" | "GOOD" | "FAIR" | "POOR";
  status:
    | "AVAILABLE"
    | "ON_LOAN"
    | "ON_HOLD"
    | "MAINTENANCE"
    | "LOST"
    | "DAMAGED"
    | "WITHDRAWN";
  shelfLocation: string | null;
  acquiredAt: string | null;
}

interface CatalogueItem {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  isbn13: string | null;
  isbn10: string | null;
  publisher: string | null;
  publishedYear: number | null;
  language: string;
  format: string;
  coverUrl: string | null;
  callNumber: string | null;
  shelfLocation: string | null;
  categoryId: string | null;
  subjects: string[];
  status: string;
  availableCopies: number;
  totalCopies: number;
  createdAt: string;
  updatedAt: string;
}

const ITEM_FORMATS = [
  "BOOK",
  "PERIODICAL",
  "REFERENCE",
  "AUDIO",
  "VIDEO",
  "OTHER",
];

const COPY_CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR"];
const COPY_STATUSES = [
  "AVAILABLE",
  "ON_LOAN",
  "ON_HOLD",
  "MAINTENANCE",
  "LOST",
  "DAMAGED",
  "WITHDRAWN",
];

export default function CataloguePage() {
  const router = useRouter();

  // Catalogue data & filter state
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isbnLookupInput, setIsbnLookupInput] = useState("");
  const [lookingUpIsbn, setLookingUpIsbn] = useState(false);
  const [isbnLookupError, setIsbnLookupError] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formAuthors, setFormAuthors] = useState("");
  const [formIsbn13, setFormIsbn13] = useState("");
  const [formIsbn10, setFormIsbn10] = useState("");
  const [formPublisher, setFormPublisher] = useState("");
  const [formPublishedYear, setFormPublishedYear] = useState<number | "">("");
  const [formLanguage, setFormLanguage] = useState("en");
  const [formFormat, setFormFormat] = useState("BOOK");
  const [formCallNumber, setFormCallNumber] = useState("");
  const [formShelfLocation, setFormShelfLocation] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSubjects, setFormSubjects] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCoverUrl, setFormCoverUrl] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // Copies Drawer / Modal
  const [selectedItemForCopies, setSelectedItemForCopies] =
    useState<CatalogueItem | null>(null);
  const [copiesList, setCopiesList] = useState<CopyItem[]>([]);
  const [copiesLoading, setCopiesLoading] = useState(false);
  const [newBarcode, setNewBarcode] = useState("");
  const [newCondition, setNewCondition] = useState<string>("NEW");
  const [newCopyShelf, setNewCopyShelf] = useState("");
  const [addingCopy, setAddingCopy] = useState(false);
  const [copyActionError, setCopyActionError] = useState<string | null>(null);

  // Load Categories for dropdowns
  async function loadCategories() {
    try {
      const res = await fetch("/api/categories", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCategories(
          Array.isArray(data)
            ? data.map((c: { id: string; name: string }) => ({
                id: c.id,
                name: c.name,
              }))
            : [],
        );
      }
    } catch {
      // Non-blocking
    }
  }

  // Load Catalogue items (with search/filters)
  async function loadCatalogue() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (formatFilter) params.set("format", formatFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (availableOnly) params.set("availableOnly", "true");

      const endpoint = params.toString()
        ? `/api/catalogue/search?${params.toString()}`
        : "/api/catalogue";

      const res = await fetch(endpoint, { credentials: "include" });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.status === 403) {
        setError("You do not have permission to view the catalogue.");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load catalogue");
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
      } else if (data && Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        setItems([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading catalogue");
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

  // ISBN Auto-Lookup
  async function handleIsbnLookup() {
    const cleanIsbn = isbnLookupInput.replace(/[-\s]/g, "").trim();
    if (!cleanIsbn) return;

    setLookingUpIsbn(true);
    setIsbnLookupError(null);

    try {
      const res = await fetch("/api/catalogue/isbn-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isbn: cleanIsbn }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "ISBN lookup failed");
      }

      if (data.title) setFormTitle(data.title);
      if (data.subtitle) setFormSubtitle(data.subtitle);
      if (Array.isArray(data.authors) && data.authors.length > 0) {
        setFormAuthors(data.authors.join(", "));
      }
      if (data.publisher) setFormPublisher(data.publisher);
      if (data.publishedYear) setFormPublishedYear(Number(data.publishedYear));
      if (data.description) setFormDescription(data.description);
      if (data.coverUrl) setFormCoverUrl(data.coverUrl);
      if (data.isbn13) setFormIsbn13(data.isbn13);
      if (data.isbn10) setFormIsbn10(data.isbn10);

      setActionMessage(
        `Auto-filled metadata for "${data.title}" via ISBN lookup.`,
      );
    } catch (err: unknown) {
      setIsbnLookupError(
        err instanceof Error ? err.message : "Could not find ISBN metadata",
      );
    } finally {
      setLookingUpIsbn(false);
    }
  }

  // Create Title
  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setSavingItem(true);
    setError(null);

    try {
      const authorsArray = formAuthors
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const subjectsArray = formSubjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        title: formTitle.trim(),
        subtitle: formSubtitle.trim() || undefined,
        authors: authorsArray,
        publisher: formPublisher.trim() || undefined,
        publishedYear: formPublishedYear
          ? Number(formPublishedYear)
          : undefined,
        language: formLanguage.trim() || "en",
        format: formFormat,
        callNumber: formCallNumber.trim() || undefined,
        shelfLocation: formShelfLocation.trim() || undefined,
        categoryId: formCategoryId || undefined,
        subjects: subjectsArray,
        description: formDescription.trim() || undefined,
        coverUrl: formCoverUrl.trim() || undefined,
      };

      if (formIsbn13.trim()) payload.isbn13 = formIsbn13.trim();
      if (formIsbn10.trim()) payload.isbn10 = formIsbn10.trim();

      const res = await fetch("/api/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create catalogue item");
      }

      setActionMessage(`"${data.title}" added to catalogue.`);
      setShowAddModal(false);
      resetForm();
      loadCatalogue();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create catalogue item",
      );
    } finally {
      setSavingItem(false);
    }
  }

  function resetForm() {
    setIsbnLookupInput("");
    setIsbnLookupError(null);
    setFormTitle("");
    setFormSubtitle("");
    setFormAuthors("");
    setFormIsbn13("");
    setFormIsbn10("");
    setFormPublisher("");
    setFormPublishedYear("");
    setFormLanguage("en");
    setFormFormat("BOOK");
    setFormCallNumber("");
    setFormShelfLocation("");
    setFormCategoryId("");
    setFormSubjects("");
    setFormDescription("");
    setFormCoverUrl("");
  }

  // Load copies for selected book
  async function openCopiesModal(item: CatalogueItem) {
    setSelectedItemForCopies(item);
    setCopiesLoading(true);
    setCopyActionError(null);
    setNewBarcode("");
    setNewCondition("NEW");
    setNewCopyShelf(item.shelfLocation || "");

    try {
      const res = await fetch(`/api/catalogue/${item.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load copies");
      const data = await res.json();
      setCopiesList(Array.isArray(data.copies) ? data.copies : []);
    } catch (err: unknown) {
      setCopyActionError(
        err instanceof Error ? err.message : "Error loading copies",
      );
    } finally {
      setCopiesLoading(false);
    }
  }

  // Add Copy to Book
  async function handleAddCopy(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItemForCopies || !newBarcode.trim()) return;

    setAddingCopy(true);
    setCopyActionError(null);

    try {
      const res = await fetch(
        `/api/catalogue/${selectedItemForCopies.id}/copies`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            barcode: newBarcode.trim(),
            condition: newCondition,
            shelfLocation: newCopyShelf.trim() || undefined,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add copy");
      }

      setNewBarcode("");
      openCopiesModal(selectedItemForCopies);
      loadCatalogue();
    } catch (err: unknown) {
      setCopyActionError(
        err instanceof Error ? err.message : "Failed to add copy",
      );
    } finally {
      setAddingCopy(false);
    }
  }

  // Update Copy Status
  async function handleUpdateCopyStatus(copyId: string, nextStatus: string) {
    if (!selectedItemForCopies) return;
    setCopyActionError(null);

    try {
      const res = await fetch(
        `/api/catalogue/${selectedItemForCopies.id}/copies/${copyId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update copy status");
      }

      openCopiesModal(selectedItemForCopies);
      loadCatalogue();
    } catch (err: unknown) {
      setCopyActionError(
        err instanceof Error ? err.message : "Failed to update copy",
      );
    }
  }

  // Withdraw Copy
  async function handleWithdrawCopy(copyId: string, barcode: string) {
    if (
      !confirm(
        `Are you sure you want to withdraw copy "${barcode}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    if (!selectedItemForCopies) return;
    setCopyActionError(null);

    try {
      const res = await fetch(
        `/api/catalogue/${selectedItemForCopies.id}/copies/${copyId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to withdraw copy");
      }

      openCopiesModal(selectedItemForCopies);
      loadCatalogue();
    } catch (err: unknown) {
      setCopyActionError(
        err instanceof Error ? err.message : "Failed to withdraw copy",
      );
    }
  }

  // Category name map
  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    categoryMap.set(c.id, c.name);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              ← Back to Profile
            </Link>
            <h1 className="text-lg font-bold">Catalogue</h1>
            <Link
              href="/categories"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Categories
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
              resetForm();
              setShowAddModal(true);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800"
          >
            + Add Title
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
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

        {/* Search & Filter Toolbar (SRC-1 & SRC-2) */}
        <div className="mb-6 bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by title, author, subject, ISBN, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-xs font-medium"
              >
                <option value="">All Formats</option>
                {ITEM_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-xs font-medium"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1.5 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="rounded text-zinc-900"
                />
                <span>Available Copies Only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Books / Catalogue Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Searching catalogue...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No titles match your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      Title &amp; Author
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Category &amp; Format
                    </th>
                    <th className="px-4 py-3 font-semibold">ISBN</th>
                    <th className="px-4 py-3 font-semibold">Call # / Shelf</th>
                    <th className="px-4 py-3 font-semibold">Availability</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          {item.coverUrl ? (
                            // biome-ignore lint/performance/noImgElement: dynamic external book cover URL
                            <img
                              src={item.coverUrl}
                              alt={item.title}
                              className="w-10 h-14 object-cover rounded shadow-sm flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-zinc-200 dark:bg-zinc-800 rounded flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">
                              {item.format === "BOOK" ? "📖" : "📄"}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className="text-xs text-zinc-500 italic">
                                {item.subtitle}
                              </div>
                            )}
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                              {Array.isArray(item.authors) &&
                              item.authors.length > 0
                                ? item.authors.join(", ")
                                : "Unknown Author"}
                              {item.publishedYear
                                ? ` • ${item.publishedYear}`
                                : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-zinc-800 dark:text-zinc-200">
                          {item.categoryId
                            ? categoryMap.get(item.categoryId) || "Category"
                            : "—"}
                        </div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {item.format}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                        {item.isbn13 || item.isbn10 || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                        <div>{item.callNumber || "—"}</div>
                        <div className="text-zinc-400">
                          {item.shelfLocation || ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            (item.availableCopies ?? 0) > 0
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {item.availableCopies ?? 0} / {item.totalCopies ?? 0}{" "}
                          Available
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openCopiesModal(item)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          Manage Copies ({item.totalCopies ?? 0})
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal: Add New Title */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-2xl w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Title to Catalogue</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            {/* Quick ISBN Auto-Lookup Box */}
            <div className="mb-5 p-3 rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
              <label className="block text-xs font-semibold mb-1">
                Fast Entry: Scan or Type ISBN (ISBN-10 or ISBN-13)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 9780132350884"
                  value={isbnLookupInput}
                  onChange={(e) => setIsbnLookupInput(e.target.value)}
                  className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleIsbnLookup}
                  disabled={lookingUpIsbn || !isbnLookupInput.trim()}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {lookingUpIsbn ? "Looking up..." : "Lookup ISBN"}
                </button>
              </div>
              {isbnLookupError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {isbnLookupError}
                </p>
              )}
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Authors (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Robert C. Martin"
                    value={formAuthors}
                    onChange={(e) => setFormAuthors(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Publisher
                  </label>
                  <input
                    type="text"
                    value={formPublisher}
                    onChange={(e) => setFormPublisher(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    ISBN-13
                  </label>
                  <input
                    type="text"
                    placeholder="13 digits"
                    value={formIsbn13}
                    onChange={(e) => setFormIsbn13(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Publication Year
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2008"
                    value={formPublishedYear}
                    onChange={(e) =>
                      setFormPublishedYear(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                  >
                    <option value="">— Unassigned —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Format
                  </label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                  >
                    {ITEM_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Dewey / Call Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 005.1 MAR"
                    value={formCallNumber}
                    onChange={(e) => setFormCallNumber(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Shelf Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A1-S3"
                    value={formShelfLocation}
                    onChange={(e) => setFormShelfLocation(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">
                    Subject Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineering, Agile, Programming"
                    value={formSubjects}
                    onChange={(e) => setFormSubjects(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {savingItem ? "Adding..." : "Add to Catalogue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manage Copies */}
      {selectedItemForCopies && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-3xl w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl my-8">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-bold">Physical Copies</h2>
                <p className="text-xs text-zinc-500">
                  {selectedItemForCopies.title} (
                  {selectedItemForCopies.isbn13 || "No ISBN"})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForCopies(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            {copyActionError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-900">
                {copyActionError}
              </div>
            )}

            {/* Add Copy Form */}
            <form
              onSubmit={handleAddCopy}
              className="mb-6 p-4 rounded-md bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                Register New Physical Copy
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Barcode *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LMS-BK-00100"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Condition
                  </label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs"
                  >
                    {COPY_CONDITIONS.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Shelf Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A1-S3"
                    value={newCopyShelf}
                    onChange={(e) => setNewCopyShelf(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={addingCopy || !newBarcode.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {addingCopy ? "Adding..." : "+ Add Copy"}
                </button>
              </div>
            </form>

            {/* Copies List */}
            <div className="overflow-x-auto">
              {copiesLoading ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  Loading copies...
                </div>
              ) : copiesList.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  No copies registered yet for this book.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Barcode</th>
                      <th className="px-3 py-2 font-semibold">Condition</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Shelf</th>
                      <th className="px-3 py-2 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {copiesList.map((cp) => (
                      <tr key={cp.id}>
                        <td className="px-3 py-2 font-mono font-medium">
                          {cp.barcode}
                        </td>
                        <td className="px-3 py-2">{cp.condition}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              cp.status === "AVAILABLE"
                                ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                                : cp.status === "ON_LOAN"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  : cp.status === "WITHDRAWN"
                                    ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {cp.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-zinc-500">
                          {cp.shelfLocation || "—"}
                        </td>
                        <td className="px-3 py-2 text-right space-x-2">
                          {cp.status !== "WITHDRAWN" && (
                            <>
                              <select
                                value={cp.status}
                                onChange={(e) =>
                                  handleUpdateCopyStatus(cp.id, e.target.value)
                                }
                                className="text-[11px] rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.5"
                              >
                                {COPY_STATUSES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() =>
                                  handleWithdrawCopy(cp.id, cp.barcode)
                                }
                                className="text-red-600 dark:text-red-400 hover:underline font-medium"
                              >
                                Withdraw
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
