import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/classnames";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  id,
  className,
  leftAddon,
  rightAddon,
  disabled,
  ...props
}: InputProps) {
  const inputId = id || props.name;

  return (
    <div className="w-full space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center rounded-lg shadow-sm">
        {leftAddon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
            {leftAddon}
          </div>
        )}

        <input
          id={inputId}
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-1",
            error
              ? "border-danger focus:border-danger focus:ring-danger"
              : "border-border focus:border-primary focus:ring-primary",
            leftAddon && "pl-9",
            rightAddon && "pr-9",
            disabled && "bg-muted opacity-60 cursor-not-allowed",
            className,
          )}
          {...props}
        />

        {rightAddon && (
          <div className="absolute right-3 flex items-center text-muted-foreground">
            {rightAddon}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
