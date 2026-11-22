import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AccessDenied({
  title = "Access Denied",
  message = "You do not have permission to view or manage this library resource.",
  requiredRole,
}: {
  title?: string;
  message?: string;
  requiredRole?: string;
}) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{message}</p>

      {requiredRole && (
        <p className="text-xs font-mono bg-muted px-2.5 py-1 rounded text-muted-foreground mb-6">
          Requires role: {requiredRole}
        </p>
      )}

      <div className="flex gap-3">
        <Link href="/profile">
          <Button variant="outline">View Profile</Button>
        </Link>
        <Link href="/catalogue">
          <Button variant="primary">Browse Catalogue</Button>
        </Link>
      </div>
    </div>
  );
}
