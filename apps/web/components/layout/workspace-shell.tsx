"use client";

import { type ReactNode, useState } from "react";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { MoreMenuDrawer } from "./more-menu-drawer";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop & Tablet Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Column */}
      <div className="flex flex-1 flex-col overflow-hidden">
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
