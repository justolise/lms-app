import type { ReactNode } from "react";
import { cn } from "@/utils/classnames";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: AlertProps) {
  const variantClasses: Record<
    AlertVariant,
    { container: string; title: string }
  > = {
    info: {
      container: "bg-primary/10 border-primary/30 text-foreground",
      title: "text-primary font-semibold",
    },
    success: {
      container: "bg-success/10 border-success/30 text-foreground",
      title: "text-success font-semibold",
    },
    warning: {
      container: "bg-warning/10 border-warning/30 text-foreground",
      title: "text-warning font-semibold",
    },
    error: {
      container: "bg-danger/10 border-danger/30 text-foreground",
      title: "text-danger font-semibold",
    },
  };

  return (
    <div
      role="alert"
      className={cn(
        "p-4 rounded-lg border text-sm",
        variantClasses[variant].container,
        className,
      )}
    >
      {title && (
        <h4 className={cn("mb-1 text-sm", variantClasses[variant].title)}>
          {title}
        </h4>
      )}
      <div>{children}</div>
    </div>
  );
}
