import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie & Local Storage Policy (PLAT-POL-04) — ComonPlace",
  description:
    "Strictly necessary session cookies and zero cross-site tracker policy.",
};

export default function CookiesPolicyPage() {
  return (
    <article className="prose dark:prose-invert max-w-none text-foreground text-sm leading-relaxed space-y-6">
      <header className="border-b border-border pb-5 not-prose space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            PLAT-POL-04
          </span>
          <span className="text-xs text-muted-foreground">
            Effective Date: November 24, 2026
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Cookie &amp; Local Storage Policy
        </h1>
        <p className="text-xs text-muted-foreground">
          Applicability: Public Visitors, Library Members, and Authenticated
          Staff
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          1. Strictly Necessary Cookies Only
        </h2>
        <p>
          ComonPlace operates on a privacy-first architecture.{" "}
          <strong>
            We do not use advertising, marketing, profiling, or third-party
            tracking cookies.
          </strong>{" "}
          All cookies issued by ComonPlace are categorized as strictly
          necessary for session security, authentication, and core library
          operations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          2. Inventory of Platform Cookies
        </h2>
        <div className="overflow-x-auto not-prose">
          <table className="w-full text-left border-collapse border border-border text-xs">
            <thead>
              <tr className="bg-surface-hover border-b border-border">
                <th className="p-2.5 font-bold text-foreground">Cookie Name</th>
                <th className="p-2.5 font-bold text-foreground">
                  Security Flags
                </th>
                <th className="p-2.5 font-bold text-foreground">Lifespan</th>
                <th className="p-2.5 font-bold text-foreground">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-2.5 font-mono text-primary font-semibold">
                  lms_access
                </td>
                <td className="p-2.5">HttpOnly, Secure, SameSite=Lax</td>
                <td className="p-2.5">15 minutes</td>
                <td className="p-2.5 text-muted-foreground">
                  Encrypted JWT access token for tenant staff / member session
                  authentication.
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-primary font-semibold">
                  lms_refresh
                </td>
                <td className="p-2.5">HttpOnly, Secure, SameSite=Lax</td>
                <td className="p-2.5">7 days</td>
                <td className="p-2.5 text-muted-foreground">
                  Hashed refresh token used for seamless session continuation
                  and token rotation.
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-primary font-semibold">
                  lms_platform_access
                </td>
                <td className="p-2.5">HttpOnly, Secure, SameSite=Strict</td>
                <td className="p-2.5">15 minutes</td>
                <td className="p-2.5 text-muted-foreground">
                  Isolated Platform Super Admin JWT token with mandatory MFA
                  verification claim.
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-primary font-semibold">
                  lms_platform_refresh
                </td>
                <td className="p-2.5">HttpOnly, Secure, SameSite=Strict</td>
                <td className="p-2.5">7 days</td>
                <td className="p-2.5 text-muted-foreground">
                  Hashed refresh token for Platform Super Admin session
                  management.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          3. Browser Local Storage
        </h2>
        <p>
          We utilize browser <code>localStorage</code> strictly for
          non-sensitive client preferences, including UI theme (light / dark
          mode) and recent search history. No personal patron records, tokens,
          or credentials are ever stored in <code>localStorage</code> or{" "}
          <code>sessionStorage</code>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          4. Cookie Management
        </h2>
        <p>
          Because all platform cookies are essential for security and
          cryptographic verification, disabling cookies via browser settings
          will prevent users from logging into the workspace or circulation
          desk.
        </p>
      </section>
    </article>
  );
}
