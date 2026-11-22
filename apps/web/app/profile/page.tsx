"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Container } from "@/components/layout/container";
import { Navbar } from "@/components/layout/navbar";
import { Spinner } from "@/components/ui/spinner";
import { LoansLedger } from "@/features/circulation/components/LoansLedger";
import { MyHoldsList } from "@/features/holds/components/MyHoldsList";
import { DeactivateModal } from "@/features/users/components/DeactivateModal";
import { ProfileCard } from "@/features/users/components/ProfileCard";
import { SessionsList } from "@/features/users/components/SessionsList";
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
    <div className="min-h-screen bg-surface-raised flex flex-col">
      <Navbar />

      <main className="flex-1 py-8">
        <Container className="max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              User Profile &amp; Settings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your personal credentials, view your borrowed books,
              monitor reservations, and review active sessions.
            </p>
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <Spinner size="md" />
              <span className="text-sm text-muted-foreground">
                Loading profile...
              </span>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              <ProfileCard
                profile={profile}
                onProfileUpdated={(updated) => setProfile(updated)}
                onDeactivateClick={() => setShowDeactivateModal(true)}
              />

              <MyHoldsList />

              <LoansLedger
                title="My Borrowed Books"
                description="List of books currently or previously checked out under your account."
              />

              <SessionsList />

              <DeactivateModal
                isOpen={showDeactivateModal}
                onClose={() => setShowDeactivateModal(false)}
              />
            </div>
          ) : null}
        </Container>
      </main>
    </div>
  );
}
