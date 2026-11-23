"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ENDPOINTS } from "@/lib/api/endpoints";

function TenantLoginContent() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [libraryName, setLibraryName] = useState<string>("");

  useEffect(() => {
    if (!slug) return;
    fetch(ENDPOINTS.public.library(slug))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.name) setLibraryName(data.name);
      })
      .catch(() => {});
  }, [slug]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 sm:p-8 text-center space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-primary uppercase">
            {slug}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {libraryName || "Library Portal"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Commonplace provides unified authentication across all libraries.
            Sign in using your registered email address or phone number.
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/login" className="block w-full">
            <Button variant="primary" className="w-full">
              Proceed to Sign In &rarr;
            </Button>
          </Link>
          <Link href={`/libraries/${slug}`} className="block w-full">
            <Button variant="outline" className="w-full">
              &larr; Back to {libraryName || "Library Portal"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TenantLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <div className="text-xs text-muted-foreground">
            Loading library portal...
          </div>
        </div>
      }
    >
      <TenantLoginContent />
    </Suspense>
  );
}
