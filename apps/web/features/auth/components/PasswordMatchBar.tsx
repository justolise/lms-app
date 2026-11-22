"use client";

import { cn } from "@/utils/classnames";

interface PasswordMatchBarProps {
  password: string;
  confirmPassword: string;
}

export function PasswordMatchBar({
  password,
  confirmPassword,
}: PasswordMatchBarProps) {
  if (!confirmPassword) {
    return null;
  }

  const isMatch = password === confirmPassword;
  const isPartialMatch = !isMatch && password.startsWith(confirmPassword);

  return (
    <div className="space-y-1.5 pt-1">
      {/* Matching progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full transition-all duration-300",
            isMatch
              ? "w-full bg-emerald-600"
              : isPartialMatch
                ? "w-1/2 bg-amber-500"
                : "w-full bg-danger",
          )}
        />
      </div>

      {/* Match status feedback */}
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            "flex items-center gap-1 font-medium",
            isMatch ? "text-emerald-600 dark:text-emerald-400" : "text-danger",
          )}
        >
          {isMatch ? (
            <>
              <span>✓</span>
              <span>Passwords match</span>
            </>
          ) : (
            <>
              <span>✗</span>
              <span>Passwords do not match</span>
            </>
          )}
        </span>
        <span className="text-[11px] text-muted-foreground font-mono">
          {confirmPassword.length} / {password.length} chars
        </span>
      </div>
    </div>
  );
}
