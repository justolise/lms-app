import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set New Password | ComonPlace Library System",
  description: "Set a new password for your library account",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Choose a New Password
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your new password below.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
          <Suspense
            fallback={
              <div className="flex justify-center p-8">
                <Spinner size="lg" />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
