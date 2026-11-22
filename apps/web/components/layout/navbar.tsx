"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import { Container } from "./container";

interface NavItem {
  label: string;
  href: string;
  permission?: Permission;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Catalogue", href: "/catalogue" },
  { label: "Categories", href: "/categories" },
  {
    label: "Circulation Desk",
    href: "/circulation",
    permission: PERMISSIONS.CIRCULATION_CHECKOUT,
  },
  {
    label: "Staff Directory",
    href: "/users",
    permission: PERMISSIONS.USERS_DIRECTORY_READ,
  },
  {
    label: "Member Types & Policies",
    href: "/member-types",
    permission: PERMISSIONS.LOAN_POLICIES_MANAGE,
  },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, role, isAuthenticated, hasPermission, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border shadow-xs">
      <Container size="xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-6">
            <Link href="/profile" className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-foreground">
                LMS Portal
              </span>
              {role && (
                <Badge variant={role === "ADMIN" ? "primary" : "muted"}>
                  {role}
                </Badge>
              )}
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile / Logout */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  className={`text-sm font-medium transition-colors px-2.5 py-1.5 rounded-lg ${
                    pathname === "/profile"
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {user?.fullName || "Profile"}
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Sign out
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="primary" size="sm">
                  Sign in
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg"
              aria-label="Toggle navigation menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Menu</title>
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-surface-hover"
              >
                {item.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <div className="border-t border-border pt-2 mt-2">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-foreground font-medium"
                >
                  Profile ({user?.fullName})
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="block w-full text-left px-3 py-2 text-sm text-danger font-medium"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm text-primary font-medium"
              >
                Sign in
              </Link>
            )}
          </div>
        )}
      </Container>
    </header>
  );
}
