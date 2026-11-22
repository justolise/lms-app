"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface PublicBook {
  id: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  isbn13?: string | null;
  publisher?: string | null;
  publishedYear?: number | null;
  language: string;
  format: string;
  coverUrl?: string | null;
  callNumber?: string | null;
  shelfLocation?: string | null;
  subjects: string[];
  availabilityStatus: "AVAILABLE" | "ON_LOAN" | null;
}

interface PublicLibrary {
  id: string;
  name: string;
  slug: string;
  libraryCode: string;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  openingHours?: string | null;
  website?: string | null;
  description?: string | null;
  borrowingRulesSummary?: string | null;
}

interface CatalogueResponse {
  items: PublicBook[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function AvailabilityBadge({
  status,
}: {
  status: "AVAILABLE" | "ON_LOAN" | null;
}) {
  if (!status) return null; // Section 2.4: Hide availability label if no circulating copies
  if (status === "AVAILABLE") {
    return (
      <Badge variant="success" className="text-xs">
        Available
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="text-xs">
      On loan
    </Badge>
  );
}

function BookCard({ book, slug }: { book: PublicBook; slug: string }) {
  return (
    <Link
      href={`/libraries/${slug}/catalogue/${book.id}`}
      className="group block h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-xl"
    >
      <Card className="flex flex-col h-full hover:shadow-md transition-all duration-200 group-hover:border-primary/50">
        <CardContent className="flex flex-col h-full p-4 gap-3">
          {/* Cover placeholder / Image */}
          <div className="aspect-2/3 w-full max-w-30 mx-auto rounded-md bg-forest-50 dark:bg-forest-900/40 border border-border flex items-center justify-center overflow-hidden shrink-0">
            {book.coverUrl ? (
              // biome-ignore lint/performance/noImgElement: External dynamic book cover URL
              <img
                src={book.coverUrl}
                alt={book.title}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <svg
                className="h-10 w-10 text-muted-foreground/40"
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
            )}
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
              {book.title}
            </h3>
            {book.subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {book.subtitle}
              </p>
            )}
            {book.authors && book.authors.length > 0 && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {book.authors.join(", ")}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2">
              <AvailabilityBadge status={book.availabilityStatus} />
              {book.format && book.format !== "BOOK" && (
                <Badge variant="muted" className="text-xs capitalize">
                  {book.format.toLowerCase()}
                </Badge>
              )}
            </div>

            {book.shelfLocation && (
              <p className="text-[11px] text-muted-foreground/80 mt-1 truncate">
                Shelf: {book.shelfLocation}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function BookCardSkeleton() {
  return (
    <Card className="flex flex-col h-full">
      <CardContent className="flex flex-col h-full p-4 gap-3">
        <Skeleton className="aspect-2/3 w-full max-w-30 mx-auto rounded-md" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

function TenantPublicCatalogueContent() {
  const params = useParams();
  const slug = (params?.slug as string) || "";

  const [library, setLibrary] = useState<PublicLibrary | null>(null);
  const [books, setBooks] = useState<PublicBook[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(24);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1); // Reset to page 1 on search change
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // Load library info
  useEffect(() => {
    if (!slug) return;
    async function loadLibrary() {
      try {
        const res = await fetch(`/api/public/libraries/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setLibrary(data);
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadLibrary();
  }, [slug]);

  // Fetch paginated catalogue
  const fetchCatalogue = useCallback(
    async (
      q: string,
      format: string,
      availOnly: boolean,
      pageNumber: number,
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams({
          page: String(pageNumber),
          limit: String(limit),
        });
        if (q.trim()) searchParams.set("q", q.trim());
        if (format) searchParams.set("format", format);
        if (availOnly) searchParams.set("availableOnly", "true");

        const res = await fetch(
          `/api/public/libraries/${slug}/catalogue?${searchParams.toString()}`,
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.message ?? `HTTP ${res.status}`);
        }

        const data: CatalogueResponse = await res.json();
        setBooks(data.items || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load library catalogue.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [slug, limit],
  );

  useEffect(() => {
    fetchCatalogue(debouncedQuery, formatFilter, availableOnly, page);
  }, [debouncedQuery, formatFilter, availableOnly, page, fetchCatalogue]);

  const libraryDisplayName = library?.name || "Library";

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Header */}
      <div className="bg-linear-to-b from-forest-50/70 to-transparent dark:from-forest-900/20 dark:to-transparent py-10 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              {library?.logoUrl && (
                // biome-ignore lint/performance/noImgElement: Library tenant branding logo
                <img
                  src={library.logoUrl}
                  alt={`${libraryDisplayName} Logo`}
                  className="h-14 w-14 object-contain rounded-xl bg-surface p-1 border border-border shadow-xs shrink-0 mt-0.5"
                />
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="primary" className="text-xs uppercase">
                    Public Catalogue
                  </Badge>
                  {library?.libraryCode && (
                    <span className="text-xs text-muted-foreground font-mono">
                      [{library.libraryCode}]
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                  {libraryDisplayName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {library?.description ||
                    "Browse our collection online. No account required."}
                </p>

                {(library?.address ||
                  library?.phone ||
                  library?.email ||
                  library?.openingHours) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    {library.openingHours && (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <span>🕒</span> {library.openingHours.split("\n")[0]}
                      </span>
                    )}
                    {library.address && (
                      <span className="flex items-center gap-1">
                        <span>📍</span> {library.address}
                      </span>
                    )}
                    {library.phone && (
                      <span className="flex items-center gap-1">
                        <span>📞</span> {library.phone}
                      </span>
                    )}
                    {library.email && (
                      <span className="flex items-center gap-1">
                        <span>✉️</span> {library.email}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 sm:self-start">
              <Link href={`/libraries/${slug}/request-membership`}>
                <Button variant="primary" size="md">
                  Request Membership
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="md">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {library?.borrowingRulesSummary && (
            <div className="bg-surface/80 rounded-xl p-3 border border-border text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-base shrink-0">📋</span>
              <div>
                <strong className="text-foreground">
                  Borrowing Guidelines:{" "}
                </strong>
                {library.borrowingRulesSummary}
              </div>
            </div>
          )}

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-3 pt-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, author, subject, or ISBN..."
                className="bg-surface shadow-sm h-11 text-base"
                leftAddon={
                  <svg
                    className="h-5 w-5 text-muted-foreground"
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
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={formatFilter}
                onChange={(e) => {
                  setFormatFilter(e.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Formats</option>
                <option value="BOOK">Books</option>
                <option value="PERIODICAL">Periodicals</option>
                <option value="REFERENCE">Reference</option>
                <option value="AUDIO">Audio</option>
                <option value="VIDEO">Video</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setAvailableOnly(!availableOnly);
                  setPage(1);
                }}
                className={`h-11 px-3.5 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                  availableOnly
                    ? "bg-forest-100 dark:bg-forest-900 border-primary text-primary"
                    : "bg-surface border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Available only</span>
                {availableOnly && (
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Results */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Results Count & Current Filters summary */}
        {!error && !isLoading && (
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <p>
              {total === 0
                ? "No matching items"
                : `Showing ${(page - 1) * limit + 1}–${Math.min(
                    page * limit,
                    total,
                  )} of ${total} item${total === 1 ? "" : "s"}`}
              {debouncedQuery && (
                <span>
                  {" "}
                  for &ldquo;<strong>{debouncedQuery}</strong>&rdquo;
                </span>
              )}
            </p>
            {totalPages > 1 && (
              <p className="text-xs">
                Page {page} of {totalPages}
              </p>
            )}
          </div>
        )}

        {/* Book Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : books.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="h-10 w-10 text-muted-foreground"
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
            }
            title={debouncedQuery ? "No results found" : "Catalogue is empty"}
            description={
              debouncedQuery
                ? `No books match "${debouncedQuery}". Try searching with a different title, author, or ISBN.`
                : "This library has no published titles at the moment."
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} slug={slug} />
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && totalPages > 1 && (
          <nav
            aria-label="Catalogue pagination"
            className="mt-10 flex items-center justify-between border-t border-border pt-4"
          >
            <div className="flex-1 flex justify-start">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Previous
              </Button>
            </div>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                let pageNumber = idx + 1;
                if (totalPages > 5 && page > 3) {
                  pageNumber = Math.min(page - 2 + idx, totalPages);
                }

                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`h-8 w-8 rounded-md text-xs font-medium transition-colors ${
                      page === pageNumber
                        ? "bg-primary text-white font-bold"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next →
              </Button>
            </div>
          </nav>
        )}
      </main>

      {/* Footer Banner */}
      <div className="border-t border-border py-8 px-4 sm:px-6 lg:px-8 bg-surface">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            Interested in borrowing books or reserving copies from{" "}
            <strong>{libraryDisplayName}</strong>?{" "}
            <Link
              href={`/libraries/${slug}/request-membership`}
              className="text-primary underline underline-offset-2 font-medium"
            >
              Request a library card
            </Link>{" "}
            or visit the front desk.
          </p>
          <Link href="/">
            <Button variant="outline" size="sm">
              All Libraries
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TenantPublicCataloguePage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 px-4 text-center text-sm text-muted-foreground">
          Loading library catalogue...
        </div>
      }
    >
      <TenantPublicCatalogueContent />
    </Suspense>
  );
}
