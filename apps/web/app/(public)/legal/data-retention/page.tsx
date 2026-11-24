import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Retention and Deletion Policy (PLAT-POL-07) — ComonPlace",
  description:
    "Retention schedules, anonymization procedures and tenant de-provisioning data lifecycle.",
};

export default function DataRetentionPage() {
  return (
    <article className="prose dark:prose-invert max-w-none text-foreground text-sm leading-relaxed space-y-6">
      <header className="border-b border-border pb-5 not-prose space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            PLAT-POL-07
          </span>
          <span className="text-xs text-muted-foreground">
            Effective Date: November 24, 2026
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Data Retention and Deletion Policy
        </h1>
        <p className="text-xs text-muted-foreground">
          Framework: KDPA 2019 Principles of Data Minimization &amp; Storage
          Limitation
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          1. Overview and Principles
        </h2>
        <p>
          In accordance with Section 39 of the Kenya Data Protection Act,
          personal data shall not be retained longer than necessary to satisfy
          the purpose for which it was collected. ComonPlace enforces
          structured retention schedules balanced against institutional auditing
          and statutory accounting obligations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          2. Schedule of Retention Periods
        </h2>
        <div className="overflow-x-auto not-prose">
          <table className="w-full text-left border-collapse border border-border text-xs">
            <thead>
              <tr className="bg-surface-hover border-b border-border">
                <th className="p-2.5 font-bold text-foreground">
                  Data Classification
                </th>
                <th className="p-2.5 font-bold text-foreground">
                  Retention Period
                </th>
                <th className="p-2.5 font-bold text-foreground">
                  Legal &amp; Operational Basis
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-2.5 font-semibold text-foreground">
                  Active Loan &amp; Hold Records
                </td>
                <td className="p-2.5">Duration of active transaction</td>
                <td className="p-2.5 text-muted-foreground">
                  Circulation desk fulfillment and physical book tracking.
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-foreground">
                  Historical Loan &amp; Return Logs
                </td>
                <td className="p-2.5">3 years after return</td>
                <td className="p-2.5 text-muted-foreground">
                  School academic record audits and inventory reconciliation.
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-foreground">
                  Fine Payments &amp; Audit Waivers
                </td>
                <td className="p-2.5">7 years after payment</td>
                <td className="p-2.5 text-muted-foreground">
                  Kenyan statutory financial accounting and audit compliance.
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-foreground">
                  Graduated / Inactive Patrons
                </td>
                <td className="p-2.5">1 year post-inactivation</td>
                <td className="p-2.5 text-muted-foreground">
                  Anonymized or purged following institutional clearance.
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-foreground">
                  System Security Audit Logs
                </td>
                <td className="p-2.5">1 year rolling window</td>
                <td className="p-2.5 text-muted-foreground">
                  Incident investigation and ODPC compliance verification.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          3. Patron Deletion and Anonymization
        </h2>
        <p>
          Upon request by an authorized library administrator or patron under
          KDPA right to erasure, member records without active loans or
          outstanding unpaid fines are pseudonymized or permanently expunged.
          Bibliographic circulation statistics are retained in aggregate form
          stripped of identifying personal data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          4. Tenant De-provisioning Lifecycle
        </h2>
        <p>
          When a library subscription expires or is cancelled, tenant data is
          maintained in a <code>SUSPENDED</code> state for 30 calendar days to
          permit full bibliographic data export. Following 30 days, tenant
          database records and associated backup archives are securely sanitized
          in accordance with NIST SP 800-88 guidelines.
        </p>
      </section>
    </article>
  );
}
