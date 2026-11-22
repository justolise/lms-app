"use client";

import { useMemo } from "react";
import { cn } from "@/utils/classnames";

interface RequirementItem {
  id: string;
  label: string;
  met: boolean;
}

export function PasswordRequirements({ password = "" }: { password: string }) {
  const length = password.length;

  const criteria: RequirementItem[] = useMemo(() => {
    return [
      {
        id: "length",
        label: "At least 8 characters",
        met: length >= 8,
      },
      {
        id: "uppercase",
        label: "At least 1 uppercase letter (A-Z)",
        met: /[A-Z]/.test(password),
      },
      {
        id: "lowercase",
        label: "At least 1 lowercase letter (a-z)",
        met: /[a-z]/.test(password),
      },
      {
        id: "number",
        label: "At least 1 number (0-9)",
        met: /\d/.test(password),
      },
      {
        id: "special",
        label: "At least 1 special character (!@#$%^&*)",
        met: /[^a-zA-Z\d]/.test(password),
      },
    ];
  }, [password, length]);

  const metCount = criteria.filter((c) => c.met).length;
  const percentage = (metCount / criteria.length) * 100;

  let strengthLabel = "Too Weak";
  let barColor = "bg-danger";
  let labelColor = "text-danger";

  if (metCount === 0) {
    strengthLabel = "Enter password";
    barColor = "bg-muted";
    labelColor = "text-muted-foreground";
  } else if (metCount <= 2) {
    strengthLabel = "Weak";
    barColor = "bg-danger";
    labelColor = "text-danger";
  } else if (metCount <= 4) {
    strengthLabel = "Moderate";
    barColor = "bg-amber-500";
    labelColor = "text-amber-500";
  } else {
    strengthLabel = "Strong";
    barColor = "bg-emerald-600";
    labelColor = "text-emerald-600 dark:text-emerald-400";
  }

  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-surface-raised/50 p-3 text-xs">
      {/* Header: Strength & Character Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="text-muted-foreground">Strength:</span>
          <span className={cn("font-semibold", labelColor)}>
            {strengthLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-muted-foreground">Length:</span>
          <span
            className={cn(
              "font-semibold px-1.5 py-0.5 rounded",
              length >= 8
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : length > 0
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {length} {length === 1 ? "char" : "chars"} (min 8)
          </span>
        </div>
      </div>

      {/* Strength Progress Bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all duration-300", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Breakdown Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[11px]">
        {criteria.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              item.met
                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                : "text-muted-foreground",
            )}
          >
            <span>{item.met ? "✓" : "○"}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
