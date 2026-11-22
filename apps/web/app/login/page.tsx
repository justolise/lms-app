import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign In | Library Management System",
  description: "Sign in to access your library account, loans, and catalogue",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-foreground">
          Library Management System
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Sign in to your library account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 shadow-md rounded-2xl border border-border sm:px-10">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
