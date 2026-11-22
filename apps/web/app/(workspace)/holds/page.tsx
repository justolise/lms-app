"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { HoldsQueue } from "@/features/holds/components/HoldsQueue";
import { MyHoldsList } from "@/features/holds/components/MyHoldsList";
import { useAuth } from "@/lib/auth/auth-context";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default function HoldsDeskPage() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState(
    hasPermission(PERMISSIONS.HOLDS_READ_ALL) ? "queue" : "my-holds",
  );

  const tabs = [];
  if (hasPermission(PERMISSIONS.HOLDS_READ_ALL)) {
    tabs.push({ id: "queue", label: "Holds Queue (All Titles)" });
  }
  tabs.push({ id: "my-holds", label: "My Active Holds" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Holds &amp; Reservations Desk
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track waiting patrons, view ready-for-pickup copies on the hold shelf,
          and manage reservations.
        </p>
      </div>

      {tabs.length > 1 && (
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      )}

      <div>
        {activeTab === "queue" && <HoldsQueue />}
        {activeTab === "my-holds" && <MyHoldsList />}
      </div>
    </div>
  );
}
