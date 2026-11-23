"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";

interface PlatformErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Localized Platform Super Admin Error Boundary
 *
 * Guarantees that failure in one platform operations tab (e.g. telemetry or audit stream)
 * does not bring down the entire platform administration console or lock out the Super Admin.
 */
export default function PlatformError({ error, reset }: PlatformErrorProps) {
  useEffect(() => {
    console.error("[Platform Operations Error Isolated]:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl py-12 px-4 space-y-6">
      <Alert variant="error" title="Platform Component Error Isolated">
        A platform administrative view encountered an unhandled exception. Other
        operational consoles (such as Tenant Directory and Security Audit Trail)
        remain functional.
      </Alert>

      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-4 shadow-xs">
        <h2 className="text-lg font-bold text-foreground">
          Platform Operations Recovery
        </h2>
        <p className="text-xs text-muted-foreground">
          Error isolated to the current administrative panel:
        </p>

        {error.message && (
          <div className="rounded-lg bg-surface-hover p-3 text-xs font-mono text-muted-foreground border border-border overflow-x-auto">
            {error.message}
          </div>
        )}

        <div className="pt-2 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => reset()} className="text-xs">
            Reload Administrative View
          </Button>
          <Link href="/platform/tenants">
            <Button variant="outline" className="text-xs">
              Go to Tenant Directory
            </Button>
          </Link>
          <Link href="/platform">
            <Button variant="outline" className="text-xs">
              Platform Overview
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
