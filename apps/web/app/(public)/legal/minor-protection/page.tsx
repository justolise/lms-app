import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Child & Minor Data Protection Policy (PLAT-POL-08) — Commonplace",
  description:
    "KDPA Section 33 compliance regarding processing of children's personal data.",
};

export default function MinorProtectionPage() {
  return (
    <article className="prose dark:prose-invert max-w-none text-foreground text-sm leading-relaxed space-y-6">
      <header className="border-b border-border pb-5 not-prose space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            PLAT-POL-08
          </span>
          <span className="text-xs text-muted-foreground">
            Effective Date: November 24, 2026
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Child &amp; Minor Data Protection Policy
        </h1>
        <p className="text-xs text-muted-foreground">
          Statutory Framework: Kenya Data Protection Act, 2019 — Section 33
          (Processing of Children&rsquo;s Data)
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          1. Statutory Commitment to Child Protection
        </h2>
        <p>
          Section 33 of the KDPA mandates heightened duties when processing
          personal data relating to children (any individual under the age of
          18). Because Commonplace is deployed across primary and secondary
          school libraries, safeguarding minor privacy is an absolute
          architectural priority.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          2. Institutional Consent and In Loco Parentis
        </h2>
        <p>
          In school settings, subscribing schools act <em>in loco parentis</em>{" "}
          under Kenyan education sector frameworks and institutional enrollment
          agreements. When creating student accounts (AUTH-4), school
          administrators warrant that appropriate parental/guardian consent has
          been obtained in compliance with KDPA Section 33(1).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          3. Strict Ban on Commercial Exploitation
        </h2>
        <p>
          Under Section 33(3) of the KDPA, processing of children&rsquo;s data
          that causes detriment or is used for commercial profiling is an
          offense. Commonplace strictly enforces:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            <strong>Zero Advertising:</strong> No advertisements, sponsored
            content, or promotional trackers are ever served to student
            accounts.
          </li>
          <li>
            <strong>No Algorithmic Profiling:</strong> Student reading habits
            are never aggregated for behavioral targeting or commercial sale.
          </li>
          <li>
            <strong>Strict Role Isolation:</strong> Student borrowing records
            and fine ledgers are visible only to the student, their assigned
            teacher, the librarian, and their linked parent account.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          4. Age-Appropriate Safeguards and Rights
        </h2>
        <p>
          Parents or legal guardians may exercise data inspection and correction
          rights on behalf of their minor children by contacting the school
          library administrator. We provide mechanisms for schools to
          expeditiously purge graduated or transferred minor records.
        </p>
      </section>
    </article>
  );
}
