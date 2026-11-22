import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/classnames";
import { Spinner } from "./spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "outline"
  | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none";

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary-hover focus:ring-primary shadow-sm",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary-hover focus:ring-secondary shadow-sm",
    danger:
      "bg-danger text-danger-foreground hover:bg-danger-hover focus:ring-danger shadow-sm",
    outline:
      "border border-border bg-transparent text-foreground hover:bg-surface-hover focus:ring-primary",
    ghost:
      "bg-transparent text-foreground hover:bg-surface-hover focus:ring-primary",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "text-xs px-2.5 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2 gap-2",
    lg: "text-base px-5 py-2.5 gap-2.5",
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner size="sm" className="mr-1" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
