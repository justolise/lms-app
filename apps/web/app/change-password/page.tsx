import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";

export const metadata: Metadata = {
  title: "Change Password | Library Management System",
  description: "Update your library account password",
};

export default function ChangePasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-2xl font-bold tracking-tight text-foreground">
          Update Account Password
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 shadow-md rounded-2xl border border-border sm:px-10">
          <Suspense
            fallback={
              <div className="flex justify-center p-8">
                <Spinner />
              </div>
            }
          >
            <ChangePasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
