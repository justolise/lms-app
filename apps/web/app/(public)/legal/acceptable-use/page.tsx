import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceptable Use Policy (PLAT-POL-03) — ComonPlace",
  description:
    "Standards of conduct and system boundaries for ComonPlace SaaS users.",
};

export default function AcceptableUsePage() {
  return (
    <article className="prose dark:prose-invert max-w-none text-foreground text-sm leading-relaxed space-y-6">
      <header className="border-b border-border pb-5 not-prose space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            PLAT-POL-03
          </span>
          <span className="text-xs text-muted-foreground">
            Effective Date: November 24, 2026
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Acceptable Use Policy
        </h1>
        <p className="text-xs text-muted-foreground">
          Applicability: All Users, Staff, Administrators, and Automated Clients
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          1. Purpose and Scope
        </h2>
        <p>
          This Acceptable Use Policy (&ldquo;AUP&rdquo;) defines the acceptable
          use of ComonPlace services, networks, and applications. All users
          must comply with this policy to safeguard system stability, security,
          and statutory compliance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          2. Prohibited Conduct
        </h2>
        <p>Users and subscribing tenants shall not:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            <strong>Unauthorized Access:</strong> Attempt to circumvent
            authentication, exploit API endpoints, or probe multi-tenant
            boundaries.
          </li>
          <li>
            <strong>Denial of Service:</strong> Flood APIs with automated
            requests, execute non-rate-limited scrapers, or disable shared
            infrastructure.
          </li>
          <li>
            <strong>Credential Sharing:</strong> Share individual staff
            accounts, publish passwords, or transmit TOTP recovery codes across
            unauthorized personnel.
          </li>
          <li>
            <strong>Malicious Uploads:</strong> Submit malformed book cover
            images, embedded malicious payloads, or exploit Open Library /
            Google Books metadata autofill.
          </li>
          <li>
            <strong>Unlawful Data:</strong> Store defamatory, obscene, or
            infringing materials in library notes, catalog records, or member
            records.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          3. Security Vulnerability Reporting
        </h2>
        <p>
          We encourage responsible disclosure of security vulnerabilities.
          Security researchers and engineers must report suspected flaws
          directly to <code>support@commonplace.co.ke</code> with steps to
          reproduce. Automated penetration testing or aggressive vulnerability
          scanning against production clusters without prior written
          authorization is strictly prohibited.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          4. Enforcement and Penalties
        </h2>
        <p>
          Violations of this AUP may result in immediate suspension of offending
          user accounts, tenant-wide rate limiting, or institutional contract
          termination without refund, alongside referral to appropriate Kenyan
          law enforcement agencies where criminal hacking or data tampering is
          suspected.
        </p>
      </section>
    </article>
  );
}
