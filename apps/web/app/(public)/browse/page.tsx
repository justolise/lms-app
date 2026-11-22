"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicBook {
  id: string;
  title: string;
  subtitle?: string;
  authors?: string[];
  isbn13?: string;
  publisher?: string;
  publishedYear?: number;
  language?: string;
  format?: string;
  coverUrl?: string;
  callNumber?: string;
  shelfLocation?: string;
  subjects?: string[];
  status?: string;
  availableCopies: number;
  totalCopies: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function AvailabilityBadge({
  available,
  total,
}: {
  available: number;
  total: number;
}) {
  if (total === 0)
    return (
      <Badge variant="muted" className="text-xs">
        No copies
      </Badge>
    );
  if (available > 0)
    return (
      <Badge variant="success" className="text-xs">
        {available}/{total} available
      </Badge>
    );
  return (
    <Badge variant="warning" className="text-xs">
      All loaned out
    </Badge>
  );
}

function BookCard({ book }: { book: PublicBook }) {
  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardContent className="flex flex-col h-full p-4 gap-3">
        {/* Cover placeholder */}
        <div className="aspect-2/3 w-full max-w-30 mx-auto rounded-md bg-forest-50 dark:bg-forest-900/40 border border-border flex items-center justify-center overflow-hidden shrink-0">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverUrl}
              alt={book.title}
              className="object-cover w-full h-full"
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
          <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-tight">
            {book.title}
          </h3>
          {book.subtitle && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {book.subtitle}
            </p>
          )}
          {book.authors && book.authors.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {book.authors.join(", ")}
            </p>
          )}
          <div className="flex flex-wrap gap-1 mt-auto pt-2">
            <AvailabilityBadge
              available={book.availableCopies}
              total={book.totalCopies}
            />
            {book.format && book.format !== "BOOK" && (
              <Badge variant="muted" className="text-xs capitalize">
                {book.format.toLowerCase()}
              </Badge>
            )}
          </div>
          {book.shelfLocation && (
            <p className="text-xs text-muted-foreground mt-1">
              Shelf: {book.shelfLocation}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
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

// ─── Main page ────────────────────────────────────────────────────────────────

interface LibraryOption {
  id: string;
  name: string;
  libraryCode: string;
}

const DEFAULT_LIBRARY_CODE = process.env.NEXT_PUBLIC_LIBRARY_CODE ?? "TEST-LIB";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3000";

export default function PublicCataloguePage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [books, setBooks] = useState<PublicBook[]>([]);
  const [libraries, setLibraries] = useState<LibraryOption[]>([]);
  const [selectedLibraryCode, setSelectedLibraryCode] =
    useState(DEFAULT_LIBRARY_CODE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Fetch libraries list on mount
  useEffect(() => {
    async function loadLibraries() {
      try {
        const res = await fetch(`${API_BASE}/public/libraries`);
        if (res.ok) {
          const list: LibraryOption[] = await res.json();
          setLibraries(list);
          if (
            list.length > 0 &&
            !list.some((l) => l.libraryCode === selectedLibraryCode)
          ) {
            setSelectedLibraryCode(list[0].libraryCode);
          }
        }
      } catch {
        // Fallback silently to default code
      }
    }
    loadLibraries();
  }, [selectedLibraryCode]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const fetchCatalogue = useCallback(async (q: string, code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        libraryCode: code,
        limit: "48",
      });
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`${API_BASE}/public/catalogue?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? `HTTP ${res.status}`);
      }
      const data: PublicBook[] | { items?: PublicBook[]; total?: number } =
        await res.json();

      if (Array.isArray(data)) {
        setBooks(data);
        setTotal(data.length);
      } else {
        setBooks(data.items ?? []);
        setTotal(data.total ?? data.items?.length ?? 0);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load catalogue. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalogue(debouncedQuery, selectedLibraryCode);
  }, [debouncedQuery, selectedLibraryCode, fetchCatalogue]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Page header */}
      <div className="bg-linear-to-b from-forest-50/60 to-transparent dark:from-forest-900/20 dark:to-transparent py-10 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">
                Library Catalogue
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse our full collection. No login required.{" "}
                <Link
                  href="/login"
                  className="text-primary underline underline-offset-2"
                >
                  Sign in
                </Link>{" "}
                to place holds or view your loans.
              </p>
            </div>
            {libraries.length > 1 ? (
              <div className="shrink-0 flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Library:
                </label>
                <select
                  value={selectedLibraryCode}
                  onChange={(e) => setSelectedLibraryCode(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {libraries.map((lib) => (
                    <option key={lib.id} value={lib.libraryCode}>
                      {lib.name} ({lib.libraryCode})
                    </option>
                  ))}
                </select>
              </div>
            ) : libraries.length === 1 ? (
              <Badge
                variant="primary"
                className="shrink-0 self-start sm:self-center"
              >
                {libraries[0].name}
              </Badge>
            ) : null}
          </div>

          {/* Search bar */}
          <div className="flex gap-2 max-w-xl">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, author, subject, or ISBN…"
              className="bg-surface shadow-sm"
              leftAddon={
                <svg
                  className="h-4 w-4 text-muted-foreground"
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
              <Button variant="outline" size="md" onClick={() => setQuery("")}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {!error && !isLoading && (
          <p className="text-sm text-muted-foreground mb-4">
            {debouncedQuery
              ? `${total} result${total !== 1 ? "s" : ""} for "${debouncedQuery}"`
              : `${total} item${total !== 1 ? "s" : ""} in collection`}
          </p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : books.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="h-10 w-10"
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
                ? `No items match "${debouncedQuery}". Try different keywords.`
                : "The library catalogue has no items yet. Check back later."
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-border py-8 px-4 sm:px-6 lg:px-8 bg-surface">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            Want to borrow books or place holds?{" "}
            <Link
              href="/login"
              className="text-primary underline underline-offset-2"
            >
              Sign in with your library account
            </Link>{" "}
            or{" "}
            <Link
              href="/request-membership"
              className="text-primary underline underline-offset-2"
            >
              apply for a library card
            </Link>
            .
          </p>
          <Link href="/">
            <Button variant="outline" size="sm">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
