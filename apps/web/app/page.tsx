"use client";

import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-surface-raised flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 py-16 flex flex-col items-center justify-center text-center">
        <Container className="max-w-4xl space-y-12">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-center">
              <Badge variant="primary">
                v1.0 MVP &bull; Kenya &amp; East Africa
              </Badge>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Modern Library Management System
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Secure multi-tenant library platform engineered for schools and
              community libraries across Kenya and East Africa.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {user ? (
                <Link href="/catalogue">
                  <Button size="lg">Explore Catalogue &rarr;</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button size="lg">Access Library Portal</Button>
                  </Link>
                  <Link href="/forgot-password">
                    <Button size="lg" variant="outline">
                      Reset Password
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-2">
              <h3 className="font-bold text-sm text-foreground">
                Multi-Tenant Isolation
              </h3>
              <p className="text-xs text-muted-foreground">
                Row-Level Security ensures complete data isolation between
                libraries while supporting single-sign-on discovery across
                tenants.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-2">
              <h3 className="font-bold text-sm text-foreground">
                Kenyan Identity Support
              </h3>
              <p className="text-xs text-muted-foreground">
                Sign in with email or Kenyan phone numbers with E.164
                normalization, SMS OTP reset, and encrypted identity documents.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-2">
              <h3 className="font-bold text-sm text-foreground">
                First-Class RBAC
              </h3>
              <p className="text-xs text-muted-foreground">
                Granular six-role authorization model with declarative UI
                gating, automated loan policies, and automated overdue fine
                assessment in KES.
              </p>
            </div>
          </div>
        </Container>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Library Management System v1.0 &copy; 2026. Production-quality
        multi-tenant school and community library automation.
      </footer>
    </div>
  );
}
