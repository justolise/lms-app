"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";

interface WorkspaceErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Localized Workspace Error Boundary
 *
 * Guarantees fault isolation: If an unhandled error occurs in a specific workspace view
 * (e.g., reports, fines, or dashboard), it is contained here.
 * The workspace shell (topbar, sidebar, and other module links) remains fully intact
 * and operational so that failure in one subsystem does not affect the rest of the application.
 */
export default function WorkspaceError({ error, reset }: WorkspaceErrorProps) {
  useEffect(() => {
    console.error("[Workspace Subsystem Error Isolated]:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl py-12 px-4 space-y-6">
      <Alert variant="error" title="Subsystem Temporarily Unavailable">
        An issue occurred in this section of your library workspace. Other
        modules (such as Circulation Desk, Catalogue, and Member Management)
        continue to operate normally.
      </Alert>

      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">
            Recovering this view
          </h2>
          <p className="text-xs text-muted-foreground">
            You can attempt to reload this view, or navigate directly to other
            operational library desks.
          </p>
        </div>

        {error.message && (
          <div className="rounded-lg bg-surface-hover p-3 text-xs font-mono text-muted-foreground border border-border overflow-x-auto">
            {error.message}
          </div>
        )}

        {error.digest && (
          <p className="text-[11px] font-mono text-muted-foreground">
            Incident Digest: {error.digest}
          </p>
        )}

        <div className="pt-2 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => reset()} className="text-xs">
            Retry This View
          </Button>
          <Link href="/circulation">
            <Button variant="outline" className="text-xs">
              Open Circulation Desk
            </Button>
          </Link>
          <Link href="/catalogue">
            <Button variant="outline" className="text-xs">
              Open Catalogue
            </Button>
          </Link>
          <Link href="/members">
            <Button variant="outline" className="text-xs">
              Open Members
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
