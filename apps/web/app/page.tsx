import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              LMS Portal
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
              v1.0 MVP
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16 flex-1 flex flex-col items-center justify-center text-center">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Modern Library Management System
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Secure multi-tenant library access for schools and community
            libraries in Kenya and East Africa.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-sm hover:bg-zinc-800 transition-colors"
            >
              Access Library Portal
            </Link>
            <Link
              href="/forgot-password"
              className="w-full sm:w-auto px-6 py-3 rounded-md border border-zinc-300 dark:border-zinc-700 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              Reset Password
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full max-w-4xl">
          <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
              Multi-Tenant Isolation
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              PostgreSQL Row-Level Security ensures complete data isolation
              between libraries while supporting single-sign-on discovery.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
              Kenyan Identity Support
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Sign in with email or Kenyan phone numbers with E.164
              normalization, OTP reset, and encrypted identity documents.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
              Strict RBAC &amp; Audit Trail
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Six-role authorization model with Argon2id password hashing, token
              rotation, and immutable security audit logs.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
        Library Management System v1.0 &copy; 2026. Production-quality
        authentication and access control.
      </footer>
    </div>
  );
}
