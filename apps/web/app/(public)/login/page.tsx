import type { Metadata } from "next";
import { Suspense } from "react";
import { ComonPlaceLogo } from "@/components/brand/comonplace-logo";
import { Spinner } from "@/components/ui/spinner";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign In | ComonPlace Library System",
  description: "Sign in to access your library account, loans, and staff desks",
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <ComonPlaceLogo variant="mark" size="lg" />
        </div>
        <h1 className="mt-4 text-center font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Sign In to ComonPlace
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Enter your email or registered phone number
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
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
