"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-raised flex items-center justify-center py-16">
      <Container className="max-w-md">
        <div className="bg-surface rounded-2xl border border-border p-8 shadow-sm text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-danger/10 text-danger mx-auto flex items-center justify-center text-2xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Unexpected Application Error
            </h1>
            <p className="text-sm text-muted-foreground">
              We encountered an issue processing your request. Please try again
              or return to the main dashboard.
            </p>
          </div>

          {error.digest && (
            <div className="text-[11px] font-mono text-muted-foreground bg-surface-raised p-2 rounded border border-border">
              Reference ID: {error.digest}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button onClick={() => reset()}>Try Again</Button>
            <Link href="/">
              <Button variant="outline" className="w-full sm:w-auto">
                Back to Safety
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
