import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Verify & Reset Password | Library Management System",
  description: "Enter your reset verification code and choose a new password",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-2xl font-bold tracking-tight text-foreground">
          Enter Verification Code
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter the code delivered to your phone/email to set your password
        </p>
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
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
