import type { ReactNode } from "react";
import { cn } from "@/utils/classnames";

export type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "muted";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    default: "bg-muted text-foreground border border-border",
    primary: "bg-primary/10 text-primary border border-primary/20",
    success: "bg-success/10 text-success border border-success/20",
    warning: "bg-warning/10 text-warning border border-warning/20",
    danger: "bg-danger/10 text-danger border border-danger/20",
    muted: "bg-muted text-muted-foreground border border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
