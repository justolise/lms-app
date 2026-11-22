"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/feedback/toast";
import { AuthProvider } from "@/lib/auth/auth-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
