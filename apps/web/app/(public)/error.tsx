"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface PublicErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Localized Public Portal Error Boundary
 *
 * Contains errors within public portal routes without crashing public navigation or the header/footer.
 */
export default function PublicError({ error, reset }: PublicErrorProps) {
  useEffect(() => {
    console.error("[Public Portal Error Isolated]:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 px-4 text-center space-y-6">
      <div className="w-12 h-12 rounded-full bg-danger/10 text-danger mx-auto flex items-center justify-center font-bold text-xl">
        !
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Content Temporarily Unavailable
        </h1>
        <p className="text-xs text-muted-foreground">
          We encountered an issue loading this page. Other parts of the library
          portal remain accessible.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button variant="primary" onClick={() => reset()} className="text-xs">
          Try Again
        </Button>
        <Link href="/">
          <Button variant="outline" className="text-xs w-full sm:w-auto">
            Return to Homepage
          </Button>
        </Link>
      </div>
    </div>
  );
}
