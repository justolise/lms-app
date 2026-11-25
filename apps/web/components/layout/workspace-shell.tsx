"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { MoreMenuDrawer } from "./more-menu-drawer";
import { Sidebar } from "./sidebar";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ slug?: string }>();
  const routeSlug = params?.slug;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      if (routeSlug) {
        router.replace(`/libraries/${routeSlug}/login`);
      } else {
        router.replace("/login");
      }
      return;
    }

    // Tenant Isolation Enforcement:
    // If accessing /libraries/[slug]/workspace/*, the user's tenantSlug must match routeSlug
    if (routeSlug && user?.tenantSlug && routeSlug !== user.tenantSlug) {
      // User belongs to another library - redirect to their library's workspace
      router.replace(`/libraries/${user.tenantSlug}/workspace/dashboard`);
      return;
    }

    // Root workspace redirect:
    // If accessing legacy root route (/dashboard, /circulation, etc.), redirect to /libraries/[slug]/workspace/...
    if (!routeSlug && user?.tenantSlug) {
      const targetPath = `/libraries/${user.tenantSlug}/workspace${pathname}`;
      router.replace(targetPath);
    }
  }, [
    isLoading,
    isAuthenticated,
    routeSlug,
    user?.tenantSlug,
    pathname,
    router,
  ]);

  // If user tenant mismatch or unauthenticated, return loading shell
  if (routeSlug && user?.tenantSlug && routeSlug !== user.tenantSlug) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">
            Switching to your authorized library workspace...
          </p>
        </div>
      </div>
    );
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
        {/* Content Viewport — always renders children so instant navigation segments are never dropped */}
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
