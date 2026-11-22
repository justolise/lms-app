import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password | Library Management System",
  description: "Request a password reset code for your library account",
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-2xl font-bold tracking-tight text-foreground">
          Reset Your Password
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your registered email address or Kenyan phone number
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 shadow-md rounded-2xl border border-border sm:px-10">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
