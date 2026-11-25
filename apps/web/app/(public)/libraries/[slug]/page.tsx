"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ENDPOINTS } from "@/lib/api/endpoints";

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

function LibraryPortalContent() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [library, setLibrary] = useState<PublicLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLibrary() {
      if (!slug) return;
      try {
        const res = await fetch(ENDPOINTS.public.library(slug));
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "Library not found"
              : "Failed to load library details",
          );
        }
        const data = await res.json();
        setLibrary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading library");
      } finally {
        setLoading(false);
      }
    }

    fetchLibrary();
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !library) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <Alert variant="error">{error || "Library branch not found."}</Alert>
        <Link href="/browse">
          <Button variant="outline">&larr; Return to Central Directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Library Hero Banner */}
      <section className="bg-forest-800 text-white py-12 sm:py-14 px-4 sm:px-6 lg:px-8 border-b border-forest-900">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2.5 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {library.logoUrl && (
                <Image
                  src={library.logoUrl}
                  alt={`${library.name} logo`}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-lg object-contain bg-white p-1"
                />
              )}
              <Badge variant="success" className="text-[11px] font-mono">
                CODE: {library.libraryCode}
              </Badge>
              <span className="text-xs text-gold-200">
                Powered by ComonPlace
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
              {library.name}
            </h1>
            {library.description && (
              <p className="text-sm text-white/85 max-w-2xl leading-relaxed">
                {library.description}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href={`/libraries/${library.slug}/catalogue`}>
              <Button
                variant="primary"
                className="bg-gold-400 hover:bg-gold-500 text-forest-900 font-bold w-full sm:w-auto"
              >
                Search Catalogue &rarr;
              </Button>
            </Link>
            <Link href={`/libraries/${library.slug}/request-membership`}>
              <Button
                variant="outline"
                className="border-white/25 text-white hover:bg-white/10 w-full sm:w-auto"
              >
                Request Membership
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Library Information Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Opening Hours & Location */}
          <Card className="md:col-span-2">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <span>🕒</span> Opening Hours &amp; Schedule
                </h2>
                <div className="rounded-xl bg-surface-hover/70 p-4 border border-border text-xs leading-relaxed text-muted-foreground whitespace-pre-line font-mono">
                  {library.openingHours ||
                    "Monday – Friday: 8:00 AM – 6:00 PM\nSaturday: 9:00 AM – 2:00 PM\nSunday & Public Holidays: Closed"}
                </div>
              </div>

              {library.borrowingRulesSummary && (
                <div className="pt-4 border-t border-border">
                  <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                    <span>📖</span> Borrowing Policies &amp; Guidelines
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                    {library.borrowingRulesSummary}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Branch Contact Details */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Branch Contacts
              </h2>

              <div className="space-y-3 text-xs">
                {library.address && (
                  <div>
                    <span className="font-semibold text-foreground">
                      Physical Address:
                    </span>
                    <p className="text-muted-foreground mt-0.5">
                      {library.address}
                    </p>
                  </div>
                )}

                {library.email && (
                  <div>
                    <span className="font-semibold text-foreground">
                      Inquiries Email:
                    </span>
                    <p className="mt-0.5">
                      <a
                        href={`mailto:${library.email}`}
                        className="text-primary hover:underline"
                      >
                        {library.email}
                      </a>
                    </p>
                  </div>
                )}

                {library.phone && (
                  <div>
                    <span className="font-semibold text-foreground">
                      Circulation Desk Phone:
                    </span>
                    <p className="mt-0.5">
                      <a
                        href={`tel:${library.phone}`}
                        className="text-primary hover:underline"
                      >
                        {library.phone}
                      </a>
                    </p>
                  </div>
                )}

                {library.website && (
                  <div>
                    <span className="font-semibold text-foreground">
                      Official Website:
                    </span>
                    <p className="mt-0.5">
                      <a
                        href={library.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {library.website}
                      </a>
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <Link href="/login" className="block w-full">
                  <Button variant="outline" className="w-full text-xs">
                    Staff &amp; Patron Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

export default function LibraryPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-12 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <LibraryPortalContent />
    </Suspense>
  );
}
