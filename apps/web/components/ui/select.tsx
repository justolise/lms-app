import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/utils/classnames";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  children?: ReactNode;
}

export function Select({
  label,
  error,
  helperText,
  id,
  className,
  options,
  children,
  disabled,
  ...props
}: SelectProps) {
  const selectId = id || props.name;

  return (
    <div className="w-full space-y-1">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}

      <select
        id={selectId}
        disabled={disabled}
        className={cn(
          "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1",
          error
            ? "border-danger focus:border-danger focus:ring-danger"
            : "border-border focus:border-primary focus:ring-primary",
          disabled && "bg-muted opacity-60 cursor-not-allowed",
          className,
        )}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>

      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
