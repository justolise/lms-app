import type { ReactNode } from "react";
import { cn } from "@/utils/classnames";

export function Container({
  children,
  size = "lg",
  className,
}: {
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}) {
  const sizeClasses = {
    sm: "max-w-3xl",
    md: "max-w-5xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-full",
  };

  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
