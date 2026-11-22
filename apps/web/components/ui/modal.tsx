"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/utils/classnames";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      {/* Click outside to close backdrop */}
      <div className="fixed inset-0" aria-hidden="true" onClick={onClose} />

      {/* Modal Dialog Content */}
      <div
        ref={modalRef}
        className={cn(
          "relative w-full rounded-xl bg-surface border border-border shadow-xl p-6 space-y-4 z-10 transition-all",
          sizeClasses[size],
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              {title && (
                <h3
                  id="modal-title"
                  className="text-lg font-semibold text-foreground"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
              aria-label="Close dialog"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Close</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>

        {footer && (
          <div className="border-t border-border pt-4 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
