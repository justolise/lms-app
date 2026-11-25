import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account and Access Policy (PLAT-POL-05) — ComonPlace",
  description:
    "Role hierarchy, credential standards, session management and mandatory MFA.",
};

export default function AccountAccessPage() {
  return (
    <article className="prose dark:prose-invert max-w-none text-foreground text-sm leading-relaxed space-y-6">
      <header className="border-b border-border pb-5 not-prose space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            PLAT-POL-05
          </span>
          <span className="text-xs text-muted-foreground">
            Effective Date: November 24, 2026
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Account and Access Policy
        </h1>
        <p className="text-xs text-muted-foreground">
          Applicability: Platform Super Admins, Tenant Admins, Librarians,
          Teachers, Members, and Parents
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          1. Role Hierarchy and Security Boundaries
        </h2>
        <p>
          ComonPlace enforces a rigid, non-bypassable role hierarchy with strict
          separation between platform governance and tenant operations:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            <strong>Platform Super Admin:</strong> Operates global platform
            infrastructure, provisions library tenants, monitors cluster health,
            and performs security audits.{" "}
            <em>Never added to tenant user tables.</em>
          </li>
          <li>
            <strong>Tenant Administrator (ADMIN):</strong> Institutional lead
            with full control over library circulation policies, member types,
            staff invitations, and branch configuration.
          </li>
          <li>
            <strong>Librarian (LIBRARIAN):</strong> Desk staff authorized to
            execute checkouts, returns, renewals, hold fulfillment, fine
            payments, and cataloging.
          </li>
          <li>
            <strong>Teacher (TEACHER):</strong> Classroom educator with extended
            borrowing allowances and class reading list views.
          </li>
          <li>
            <strong>Member (MEMBER):</strong> Student or community patron with
            public catalog search, active loan inspection, and hold placement
            permissions.
          </li>
          <li>
            <strong>Parent (PARENT):</strong> Linked guardian with read-only
            visibility over their dependent&rsquo;s borrowing records and
            overdue notices.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          2. Credential Complexity Standards
        </h2>
        <p>
          All passwords must satisfy minimum complexity requirements: at least 8
          characters including uppercase, lowercase, numbers, and special
          symbols. Passwords are cryptographically hashed using{" "}
          <strong>Argon2id</strong>. Plaintext passwords are never logged,
          stored, or transmitted.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          3. Multi-Factor Authentication (MFA)
        </h2>
        <p>
          Platform Super Administrators are subject to mandatory RFC 6238
          Time-Based One-Time Password (TOTP) two-factor authentication.
          Platform login tokens require an explicit{" "}
          <code>mfaVerified: true</code> cryptographic assertion. MFA secret
          keys are stored encrypted via AES-256-GCM.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          4. Session Management and Revocation
        </h2>
        <p>
          Access tokens expire in 15 minutes. Refresh tokens are tracked
          statefully in Redis and PostgreSQL. Refresh token reuse triggers
          immediate automated session revocation across all client devices to
          counter token theft.
        </p>
      </section>
    </article>
  );
}
