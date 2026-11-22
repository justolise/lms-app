import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password | Commonplace Library System",
  description: "Request a password reset link for your library account",
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Reset Your Password
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your email address or phone number and we will send recovery
          instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
