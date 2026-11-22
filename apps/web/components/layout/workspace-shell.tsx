"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth/auth-context";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { MoreMenuDrawer } from "./more-menu-drawer";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Desktop & Tablet Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Column */}
      <div className="flex flex-1 flex-col h-dvh min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar onMenuToggle={() => setMoreMenuOpen(true)} />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav onMoreClick={() => setMoreMenuOpen(true)} />

        {/* Mobile "More" Drawer */}
        <MoreMenuDrawer
          isOpen={moreMenuOpen}
          onClose={() => setMoreMenuOpen(false)}
        />
      </div>
    </div>
  );
}
