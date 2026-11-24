"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";

interface PublicLibrarySummary {
  id: string;
  name: string;
  slug: string;
  libraryCode?: string;
  logoUrl?: string | null;
  description?: string | null;
  address?: string | null;
}

export default function PublicHomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [libraries, setLibraries] = useState<PublicLibrarySummary[]>([]);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(ENDPOINTS.public.libraries)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!active) return;
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setLibraries(items.slice(0, 6));
      })
      .catch(() => {
        if (active) setLibraries([]);
      })
      .finally(() => {
        if (active) setLibrariesLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/browse");
    }
  };

  return (
    <div className="flex flex-col bg-background">
      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section className="border-b border-border bg-background py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Copy, Search & CTAs */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/60 bg-gold-100/70 dark:bg-forest-900/60 px-3.5 py-1 text-xs font-semibold text-forest-800 dark:text-gold-200">
              <span
                className="h-1.5 w-1.5 rounded-full bg-forest-800 dark:bg-gold-400"
                aria-hidden="true"
              />
              <span>Knowledge. Community. Opportunity.</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
              A place for knowledge.{" "}
              <span className="text-primary">A place for everyone.</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              ComonPlace brings libraries, readers and communities together
              through a simple, welcoming digital library experience.
            </p>

            {/* Search Box */}
            <form
              onSubmit={handleSearch}
              className="mx-auto lg:mx-0 max-w-xl flex flex-col sm:flex-row gap-2.5"
            >
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, author, subject, or ISBN..."
                aria-label="Search library catalogue"
                className="bg-surface shadow-xs h-12 text-base"
                leftAddon={
                  <svg
                    className="h-5 w-5 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
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
              <Button type="submit" size="lg" className="shrink-0 h-12 px-6">
                Search Catalogue
              </Button>
            </form>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="md" className="gap-2">
                    <span>Open Library Workspace</span>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button size="md">Sign In to Your Library</Button>
                  </Link>
                  <Link href="/request-membership">
                    <Button size="md" variant="outline">
                      Request Membership
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Warm Library Photography */}
          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-muted shadow-sm">
              <Image
                src="/images/comonplace-library-hero.webp"
                alt="Warm, sunlit reading room with wooden bookshelves, reading tables, and greenery"
                width={836}
                height={470}
                priority
                className="w-full h-auto aspect-video object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Platform Introduction & Feature Presentation ─────────────── */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="max-w-2xl space-y-2 mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Built for East African Libraries
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
            Organised collections, connected readers
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Designed for school administrators, librarians, teachers, students,
            and community reading spaces.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-surface border-border">
            <CardContent className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 dark:bg-forest-900/50 text-primary">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Catalogue &amp; Discovery
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Search titles, authors, subjects, and ISBNs with live copy
                availability across physical shelves and reading rooms.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardContent className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 dark:bg-forest-900/50 text-primary">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Circulation &amp; Holds
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Fast checkouts, returns, renewals, and fair reservation queues
                with timely reminders for patrons and staff.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardContent className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 dark:bg-forest-900/50 text-primary">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Trusted Governance
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Strict library isolation, role-based access, and data protection
                aligned with the Kenya Data Protection Act, 2019.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Library Directory Section ────────────────────────────────── */}
      {librariesLoaded && libraries.length > 0 && (
        <section className="border-t border-border bg-surface/60 py-14 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Participating Libraries
                </p>
                <h2 className="font-serif text-2xl font-bold text-foreground mt-1">
                  Explore library branches
                </h2>
              </div>
              <Link
                href="/browse"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Browse all catalogues &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {libraries.map((lib) => (
                <Link
                  key={lib.id}
                  href={`/libraries/${lib.slug}`}
                  className="group block"
                >
                  <Card className="h-full bg-surface border-border transition-colors group-hover:border-primary/50">
                    <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          {lib.logoUrl ? (
                            <img
                              src={lib.logoUrl}
                              alt={`${lib.name} logo`}
                              className="h-10 w-10 rounded-lg object-contain border border-border bg-background p-1 shrink-0"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-800 text-gold-400 font-serif font-bold text-base shrink-0">
                              {lib.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-serif text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {lib.name}
                            </h3>
                            {lib.address && (
                              <p className="text-xs text-muted-foreground truncate">
                                {lib.address}
                              </p>
                            )}
                          </div>
                        </div>

                        {lib.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {lib.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-medium text-primary">
                        <span>Visit library portal</span>
                        <span aria-hidden="true">&rarr;</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Warm Closing CTA ─────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              Looking to join a library or onboard your school?
            </h2>
            <p className="text-sm text-muted-foreground">
              Request a library membership or speak with the ComonPlace team.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link href="/request-membership">
              <Button variant="primary">Request Membership</Button>
            </Link>
            <Link href="/for-schools-libraries">
              <Button variant="outline">For Schools &amp; Libraries</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
