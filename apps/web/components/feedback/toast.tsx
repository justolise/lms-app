"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { cn } from "@/utils/classnames";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const ICONS: Record<ToastVariant, ReactNode> = {
  success: (
    <svg
      className="h-5 w-5 text-success shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <title>Success</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
  error: (
    <svg
      className="h-5 w-5 text-danger shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <title>Error</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  ),
  warning: (
    <svg
      className="h-5 w-5 text-warning shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <title>Warning</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  info: (
    <svg
      className="h-5 w-5 text-primary shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <title>Info</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, variant, title, description };

      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  const toast = {
    success: (title: string, description?: string) =>
      addToast("success", title, description),
    error: (title: string, description?: string) =>
      addToast("error", title, description),
    warning: (title: string, description?: string) =>
      addToast("warning", title, description),
    info: (title: string, description?: string) =>
      addToast("info", title, description),
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}

      {/* Floating Toast Container */}
      <div
        aria-live="assertive"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg bg-surface transition-all animate-in fade-in slide-in-from-bottom-3",
              item.variant === "success" && "border-success/30 text-foreground",
              item.variant === "error" && "border-danger/30 text-foreground",
              item.variant === "warning" && "border-warning/30 text-foreground",
              item.variant === "info" && "border-primary/30 text-foreground",
            )}
          >
            {ICONS[item.variant]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              className="text-muted-foreground hover:text-foreground text-xs p-1 rounded-md transition-colors"
              aria-label="Dismiss notification"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
