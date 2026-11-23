import type { Metadata } from "next";
import Link from "next/link";
import { POLICIES } from "./policies-data";

export const metadata: Metadata = {
  title: "Legal & Policy Center — Commonplace",
  description:
    "Official regulatory and operating policies for the Commonplace Library Management System SaaS platform.",
};

export default function LegalIndexPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded-md bg-forest-50 dark:bg-forest-900/40 px-2 py-0.5 text-[11px] font-bold text-primary uppercase">
            Regulatory &amp; Compliance Center
          </span>
          <span className="text-xs text-muted-foreground">
            Version 1.0 (v1.0 MVP)
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Commonplace Platform Policies &amp; Governance
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Commonplace is a multi-tenant Software-as-a-Service (SaaS) platform
          built for libraries, schools, and educational institutions in Kenya
          and East Africa. These binding platform policies define our
          contractual, security, data privacy, and service availability
          commitments under the{" "}
          <strong>Kenya Data Protection Act, 2019 (KDPA)</strong> and general
          applicable laws.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {POLICIES.map((p) => (
          <Link
            key={p.code}
            href={p.href}
            className="group block p-5 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-surface-hover transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-primary group-hover:underline">
                {p.code}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Read Policy &rarr;
              </span>
            </div>
            <h2 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
              {p.title}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {p.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="pt-6 border-t border-border space-y-3 text-xs text-muted-foreground">
        <h3 className="text-sm font-semibold text-foreground">
          Questions or Legal Enquiries?
        </h3>
        <p>
          For regulatory inquiries, Data Protection Officer requests, or
          incident disclosures, contact the Commonplace Data Governance desk at{" "}
          <a
            href="mailto:support@commonplace.co.ke"
            className="text-primary underline"
          >
            support@commonplace.co.ke
          </a>
          .
        </p>
      </div>
    </div>
  );
}
