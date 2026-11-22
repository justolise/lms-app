"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";

export default function PublicHomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/browse");
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-b from-forest-50/60 to-transparent dark:from-forest-900/20 dark:to-transparent py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex justify-center mb-4">
            <Badge variant="primary" className="text-xs py-1 px-3">
              Kenya &amp; East Africa Multi-Tenant LMS
            </Badge>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Commonplace <span className="text-primary">Library System</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg max-w-2xl mx-auto">
            A fast, secure, modern library platform for schools, colleges, and
            community libraries. Discover books, reserve titles, and manage
            loans with ease.
          </p>

          {/* Search Box */}
          <form
            onSubmit={handleSearch}
            className="mt-8 mx-auto max-w-xl flex gap-2"
          >
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, subject, or ISBN..."
              className="bg-surface shadow-sm h-12 text-base"
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
            <Button type="submit" size="lg" className="shrink-0 h-12 px-6">
              Search
            </Button>
          </form>

          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="md" className="gap-2">
                  <span>Go to Staff Workspace</span>
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
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button size="md">Staff &amp; Patron Sign In</Button>
                </Link>
                <Link href="/request-membership">
                  <Button size="md" variant="outline">
                    Request New Membership
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 dark:bg-forest-900/50 text-primary">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-foreground">
                Complete Catalogue
              </h3>
              <p className="text-sm text-muted-foreground">
                Browse our collection across fiction, sciences, humanities, and
                periodicals with live copy availability tracking.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 dark:bg-forest-900/50 text-primary">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-foreground">
                Holds &amp; Reservations
              </h3>
              <p className="text-sm text-muted-foreground">
                Reserve popular titles when copies are loaned out. Receive
                notification as soon as a copy returns to the hold shelf.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 dark:bg-forest-900/50 text-primary">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-foreground">
                Safe &amp; Regulated
              </h3>
              <p className="text-sm text-muted-foreground">
                Engineered in compliance with Kenya Data Protection Act 2019.
                Transparent loan policies and automated overdue alerts.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Library Hours & Visiting Info */}
      <section className="bg-surface border-y border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-foreground">
              Library Hours &amp; Services
            </h3>
            <p className="text-sm text-muted-foreground">
              Monday &ndash; Friday: 8:00 AM &ndash; 7:00 PM &bull; Saturday:
              9:00 AM &ndash; 4:00 PM &bull; Sunday: Closed
            </p>
          </div>
          <Link href="/request-membership">
            <Button variant="outline" className="shrink-0">
              Apply for Library Card
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
