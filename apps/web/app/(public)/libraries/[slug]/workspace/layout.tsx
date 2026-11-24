"use client";

import { type ReactNode, Suspense } from "react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function TenantWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<div className="h-dvh w-full bg-background" />}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  );
}
