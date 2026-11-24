import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";

export const metadata: Metadata = {
  title: "Change Password | ComonPlace Library System",
  description: "Update your password or complete first-login security gate",
};

export default function ChangePasswordPage() {
  return (
    <div className="max-w-md mx-auto py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Security Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your account password or complete your initial login
          requirements.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
        <Suspense
          fallback={
            <div className="flex justify-center p-8">
              <Spinner size="lg" />
            </div>
          }
        >
          <ChangePasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
