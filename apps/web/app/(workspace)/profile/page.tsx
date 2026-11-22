"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Spinner } from "@/components/ui/spinner";
import { LoansLedger } from "@/features/circulation/components/LoansLedger";
import { MyHoldsList } from "@/features/holds/components/MyHoldsList";
import { DeactivateModal } from "@/features/users/components/DeactivateModal";
import { ProfileCard } from "@/features/users/components/ProfileCard";
import { usersService } from "@/features/users/services/users.service";
import type { UserProfile } from "@/features/users/types/users.types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const data = await usersService.getProfile();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          User Profile &amp; Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your credentials, view borrowed items, and view active holds.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : profile ? (
        <div className="space-y-6">
          <ProfileCard
            profile={profile}
            onProfileUpdated={(updated) => setProfile(updated)}
            onDeactivateClick={() => setShowDeactivateModal(true)}
          />

          <div className="space-y-2 pt-4">
            <h2 className="text-lg font-bold text-foreground">
              My Borrowed Books
            </h2>
            <LoansLedger userId={profile.id} />
          </div>

          <div className="space-y-2 pt-4">
            <h2 className="text-lg font-bold text-foreground">
              My Active Holds
            </h2>
            <MyHoldsList />
          </div>

          {showDeactivateModal && (
            <DeactivateModal
              isOpen={showDeactivateModal}
              onClose={() => setShowDeactivateModal(false)}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
