"use client";

import { useState } from "react";
import { RequirePermission } from "@/components/auth/require-permission";
import { Container } from "@/components/layout/container";
import { Navbar } from "@/components/layout/navbar";
import { CheckoutDesk } from "@/features/circulation/components/CheckoutDesk";
import { RenewDesk } from "@/features/circulation/components/RenewDesk";
import { ReturnDesk } from "@/features/circulation/components/ReturnDesk";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { cn } from "@/utils/classnames";

type Tab = "checkout" | "return" | "renew";

export default function CirculationPage() {
  const [activeTab, setActiveTab] = useState<Tab>("checkout");

  return (
    <div className="min-h-screen bg-surface-raised flex flex-col">
      <Navbar />

      <RequirePermission permission={PERMISSIONS.CIRCULATION_CHECKOUT}>
        <main className="flex-1 py-8">
          <Container className="max-w-3xl space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Circulation Desk
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Issue books, process returns with automated fine assessment, and
                extend active loans.
              </p>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-border space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab("checkout")}
                className={cn(
                  "pb-3 text-sm font-semibold border-b-2 -mb-px transition-colors",
                  activeTab === "checkout"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Checkout (Issue)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("return")}
                className={cn(
                  "pb-3 text-sm font-semibold border-b-2 -mb-px transition-colors",
                  activeTab === "return"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Return (Check-in)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("renew")}
                className={cn(
                  "pb-3 text-sm font-semibold border-b-2 -mb-px transition-colors",
                  activeTab === "renew"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Renew Loan
              </button>
            </div>

            {/* Active Tab Desk */}
            <div>
              {activeTab === "checkout" && <CheckoutDesk />}
              {activeTab === "return" && <ReturnDesk />}
              {activeTab === "renew" && <RenewDesk />}
            </div>
          </Container>
        </main>
      </RequirePermission>
    </div>
  );
}
