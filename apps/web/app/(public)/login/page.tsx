import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign In | Commonplace Library System",
  description: "Sign in to access your library account, loans, and staff desks",
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-800 text-white shadow-md">
            <svg
              className="h-7 w-7 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Sign In to Commonplace
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Enter your email or registered phone number
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
