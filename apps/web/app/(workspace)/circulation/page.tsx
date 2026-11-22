"use client";

import { useState } from "react";
import { RequirePermission } from "@/components/auth/require-permission";
import { Tabs } from "@/components/ui/tabs";
import { CheckoutDesk } from "@/features/circulation/components/CheckoutDesk";
import { LoansLedger } from "@/features/circulation/components/LoansLedger";
import { RenewDesk } from "@/features/circulation/components/RenewDesk";
import { ReturnDesk } from "@/features/circulation/components/ReturnDesk";
import { HoldsQueue } from "@/features/holds/components/HoldsQueue";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default function CirculationPage() {
  const [activeTab, setActiveTab] = useState("checkout");

  const tabs = [
    { id: "checkout", label: "Checkout (Issue)" },
    { id: "return", label: "Return (Discharge)" },
    { id: "renew", label: "Renew Loan" },
    { id: "loans", label: "Active Loans Ledger" },
    { id: "holds", label: "Holds Queue" },
  ];

  return (
    <RequirePermission permission={PERMISSIONS.CIRCULATION_CHECKOUT}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Circulation Desk
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Issue books, process returns with automated fine assessment, extend
            active loans, audit the loans ledger, and manage the holds queue.
          </p>
        </div>

        {/* Tab navigation */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab content */}
        <div>
          {activeTab === "checkout" && <CheckoutDesk />}
          {activeTab === "return" && <ReturnDesk />}
          {activeTab === "renew" && <RenewDesk />}
          {activeTab === "loans" && <LoansLedger />}
          {activeTab === "holds" && <HoldsQueue />}
        </div>
      </div>
    </RequirePermission>
  );
}
