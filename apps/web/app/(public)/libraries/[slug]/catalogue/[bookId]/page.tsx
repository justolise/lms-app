"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ENDPOINTS } from "@/lib/api/endpoints";

interface PublicBookDetail {
  id: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  isbn13?: string | null;
  isbn10?: string | null;
  publisher?: string | null;
  publishedYear?: number | null;
  language: string;
  format: string;
  coverUrl?: string | null;
  callNumber?: string | null;
  shelfLocation?: string | null;
  subjects: string[];
  description?: string | null;
  categoryName?: string | null;
  availabilityStatus: "AVAILABLE" | "ON_LOAN" | null;
}

function AvailabilityBanner({
  status,
}: {
  status: "AVAILABLE" | "ON_LOAN" | null;
}) {
  if (!status) {
    return (
      <div className="p-4 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground flex items-center gap-2">
        <svg
          className="h-4 w-4 text-muted-foreground shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          Copies of this item are currently not in circulating inventory. Visit
          the librarian desk for reference inquiries.
        </span>
      </div>
    );
  }

  if (status === "AVAILABLE") {
    return (
      <div className="p-4 rounded-xl border border-forest-500/30 bg-forest-50/60 dark:bg-forest-900/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-100 dark:bg-forest-800 text-primary shrink-0">
            <svg
              className="h-5 w-5"
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
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Available on Shelf
            </h4>
            <p className="text-xs text-muted-foreground">
              Circulating copies are currently available for checkout at this
              library branch.
            </p>
          </div>
        </div>
        <Badge variant="success" className="text-xs shrink-0 py-1 px-3">
          Available
        </Badge>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shrink-0">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-foreground">
            All Copies On Loan
          </h4>
          <p className="text-xs text-muted-foreground">
            Circulating copies are currently loaned out. Patrons with library
            cards may place holds.
          </p>
        </div>
      </div>
      <Badge variant="warning" className="text-xs shrink-0 py-1 px-3">
        On loan
      </Badge>
    </div>
  );
}

function TenantPublicBookDetailContent() {
  const params = useParams();
  const slug = (params?.slug as string) || "";
  const bookId = params?.bookId as string;

  const [book, setBook] = useState<PublicBookDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !bookId) return;
    async function loadBook() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(ENDPOINTS.public.catalogueItem(slug, bookId));
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.message ?? `HTTP ${res.status}`);
        }
        const data: PublicBookDetail = await res.json();
        setBook(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load book bibliographic details.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (slug && bookId) {
      loadBook();
    }
  }, [slug, bookId]);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-2 text-xs text-muted-foreground"
      >
        <Link href="/" className="hover:text-foreground">
          Libraries
        </Link>
        <span>&rsaquo;</span>
        <Link
          href={`/libraries/${slug}/catalogue`}
          className="hover:text-foreground capitalize"
        >
          {slug.replace(/-/g, " ")} Catalogue
        </Link>
        <span>&rsaquo;</span>
        <span className="text-foreground truncate max-w-xs font-medium">
          {book?.title || "Book Detail"}
        </span>
      </nav>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Skeleton className="aspect-2/3 w-full max-w-60 mx-auto rounded-lg" />
          </div>
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      ) : !book ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Book could not be found.</p>
          <div className="mt-4">
            <Link href={`/libraries/${slug}/catalogue`}>
              <Button variant="outline">Back to Catalogue</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Book Header Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {/* Book Cover */}
            <div className="md:col-span-1 flex flex-col items-center">
              <div className="aspect-2/3 w-full max-w-60 rounded-xl bg-forest-50 dark:bg-forest-900/30 border border-border shadow-sm flex items-center justify-center overflow-hidden">
                {book.coverUrl ? (
                  // biome-ignore lint/performance/noImgElement: External dynamic book cover URL
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <svg
                    className="h-16 w-16 text-muted-foreground/30"
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

              <div className="mt-4 w-full max-w-60 space-y-2">
                <Link
                  href={`/libraries/${slug}/catalogue`}
                  className="w-full block"
                >
                  <Button variant="outline" size="sm" className="w-full">
                    &larr; Back to Catalogue
                  </Button>
                </Link>
              </div>
            </div>

            {/* Book Meta & Details */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="primary" className="text-xs uppercase">
                    {book.format}
                  </Badge>
                  {book.categoryName && (
                    <Badge variant="muted" className="text-xs">
                      {book.categoryName}
                    </Badge>
                  )}
                  {book.language && (
                    <span className="text-xs text-muted-foreground uppercase">
                      Language: {book.language}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-snug">
                  {book.title}
                </h1>
                {book.subtitle && (
                  <h2 className="text-base text-muted-foreground mt-1">
                    {book.subtitle}
                  </h2>
                )}

                {book.authors && book.authors.length > 0 && (
                  <p className="text-sm font-medium text-foreground mt-2">
                    By{" "}
                    <span className="text-primary font-semibold">
                      {book.authors.join(", ")}
                    </span>
                  </p>
                )}
              </div>

              {/* Live Availability Status Banner */}
              <AvailabilityBanner status={book.availabilityStatus} />

              {/* Description */}
              {book.description && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground">Summary</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {book.description}
                  </p>
                </div>
              )}

              {/* Bibliographic Specifications Table */}
              <Card>
                <CardHeader className="py-3 px-4 border-b border-border">
                  <CardTitle className="text-sm">
                    Bibliographic Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs">
                  {book.publisher && (
                    <div>
                      <span className="text-muted-foreground block">
                        Publisher
                      </span>
                      <span className="font-medium text-foreground">
                        {book.publisher}
                      </span>
                    </div>
                  )}

                  {book.publishedYear && (
                    <div>
                      <span className="text-muted-foreground block">
                        Publication Year
                      </span>
                      <span className="font-medium text-foreground">
                        {book.publishedYear}
                      </span>
                    </div>
                  )}

                  {book.isbn13 && (
                    <div>
                      <span className="text-muted-foreground block">
                        ISBN-13
                      </span>
                      <span className="font-mono text-foreground font-medium">
                        {book.isbn13}
                      </span>
                    </div>
                  )}

                  {book.isbn10 && (
                    <div>
                      <span className="text-muted-foreground block">
                        ISBN-10
                      </span>
                      <span className="font-mono text-foreground font-medium">
                        {book.isbn10}
                      </span>
                    </div>
                  )}

                  {book.callNumber && (
                    <div>
                      <span className="text-muted-foreground block">
                        Call Number (Dewey/Local)
                      </span>
                      <span className="font-mono text-foreground font-medium">
                        {book.callNumber}
                      </span>
                    </div>
                  )}

                  {book.shelfLocation && (
                    <div>
                      <span className="text-muted-foreground block">
                        Physical Shelf Location
                      </span>
                      <span className="font-medium text-foreground">
                        {book.shelfLocation}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subject Tags */}
              {book.subjects && book.subjects.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Subjects &amp; Keywords
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {book.subjects.map((sub) => (
                      <Badge key={sub} variant="muted" className="text-xs">
                        {sub}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Public Member Callout */}
              <div className="p-4 rounded-xl border border-primary/20 bg-forest-50/50 dark:bg-forest-900/10 space-y-2">
                <h4 className="text-sm font-bold text-foreground">
                  Want to borrow this title or place a reservation?
                </h4>
                <p className="text-xs text-muted-foreground">
                  Circulation and hold placement require a verified patron card
                  from this library.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <Link href={`/libraries/${slug}/request-membership`}>
                    <Button variant="primary" size="sm">
                      Apply for Library Card
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="sm">
                      Patron Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TenantPublicBookDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 px-4 text-center text-sm text-muted-foreground">
          Loading book details...
        </div>
      }
    >
      <TenantPublicBookDetailContent />
    </Suspense>
  );
}
