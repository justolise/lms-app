import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Information Security Policy (PLAT-POL-06) — ComonPlace",
  description:
    "Technical, physical and administrative security controls in ComonPlace LMS.",
};

export default function SecurityPolicyPage() {
  return (
    <article className="prose dark:prose-invert max-w-none text-foreground text-sm leading-relaxed space-y-6">
      <header className="border-b border-border pb-5 not-prose space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            PLAT-POL-06
          </span>
          <span className="text-xs text-muted-foreground">
            Effective Date: November 24, 2026
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Information Security Policy
        </h1>
        <p className="text-xs text-muted-foreground">
          Standards: OWASP Top 10 | CIS Benchmarks | KDPA 2019 Section 41
          Safeguards
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          1. Cryptographic Safeguards
        </h2>
        <p>
          ComonPlace employs modern, verified cryptographic primitives across
          every layer:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            <strong>Password Hashing:</strong> Argon2id configured with 64MB
            memory, 3 iterations, and 4 parallel lanes.
          </li>
          <li>
            <strong>Data at Rest:</strong> AES-256-GCM authenticated encryption
            for sensitive identifiers and TOTP secrets.
          </li>
          <li>
            <strong>Data in Transit:</strong> TLS 1.3 encryption with modern
            cipher suites and Strict Transport Security (HSTS).
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          2. Multi-Tenant Row-Level Security (RLS)
        </h2>
        <p>
          PostgreSQL Row-Level Security policies are active on every
          tenant-scoped table. Every database query executed through{" "}
          <code>DatabaseService.withTenant()</code> runs inside an isolated
          transaction with <code>SET LOCAL app.current_tenant_id</code>. Tenant
          data isolation is physically enforced by the database engine,
          eliminating cross-tenant leakage risks even in the event of
          application logic defects.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          3. Request Observability and Correlation
        </h2>
        <p>
          Every API request is stamped with a unique{" "}
          <code>X-Correlation-ID</code> UUID header. Request logs are structured
          in JSON format with correlation IDs, method, status, duration, and
          client IP, enabling end-to-end incident diagnosis and tracing without
          recording plaintext credentials or patron personal identifiers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          4. Vulnerability Management
        </h2>
        <p>
          All dependencies are audited via automated CI vulnerability scanners.
          Production container images run as non-root users on minimal Alpine
          Linux bases with zero unnecessary packages.
        </p>
      </section>
    </article>
  );
}
