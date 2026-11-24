import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Terms of Service (PLAT-POL-01) — ComonPlace",
  description:
    "Terms governing the use of ComonPlace Library Management System SaaS platform.",
};

export default function TermsOfServicePage() {
  return (
    <article className="prose dark:prose-invert max-w-none text-foreground text-sm leading-relaxed space-y-6">
      <header className="border-b border-border pb-5 not-prose space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            PLAT-POL-01
          </span>
          <span className="text-xs text-muted-foreground">
            Effective Date: November 24, 2026
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Platform Terms of Service
        </h1>
        <p className="text-xs text-muted-foreground">
          Applicability: All subscribing Libraries, Tenant Administrators,
          Staff, and Patrons
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          1. Introduction and Agreement
        </h2>
        <p>
          These Platform Terms of Service (&ldquo;Terms&rdquo;) constitute a
          legally binding agreement between ComonPlace (&ldquo;Platform
          Provider&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) and the library,
          educational institution, or school (&ldquo;Subscribing Tenant&rdquo;)
          accessing or utilizing the ComonPlace Library Management System (the
          &ldquo;Service&rdquo;). By accessing the Service, the Subscribing
          Tenant agrees to be bound by these Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          2. SaaS Provision and Tenant Isolation
        </h2>
        <p>
          ComonPlace delivers a cloud-hosted, multi-tenant software
          application. Each Subscribing Tenant is provisioned an isolated
          logical environment. Data isolation is guaranteed at the database
          layer through strict PostgreSQL Row-Level Security (RLS) policies.
          Platform Super Administrators maintain platform health and
          infrastructure but do not inspect or modify catalog, loan, or patron
          data outside authorized support escalations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          3. Tenant Administrator Responsibilities
        </h2>
        <p>
          The Subscribing Tenant designates one or more authorized Tenant
          Administrators (&ldquo;Admins&rdquo;). Admins are responsible for:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            Ensuring all staff accounts are assigned following the principle of
            least privilege.
          </li>
          <li>
            Maintaining confidentiality of credentials and enforcing strong
            passwords.
          </li>
          <li>
            Accurate input of library circulation rules, fines, and patron
            identifiers.
          </li>
          <li>
            Promptly revoking access for departed or reassigned staff members.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          4. Subscriptions, Fees, and Renewals
        </h2>
        <p>
          Access to ComonPlace is billed on an agreed institutional
          subscription schedule (annual or term-based). Subscriptions grant
          rights to maintain catalog records, active loans, and member accounts.
          Renewal terms and notice periods are specified in the Institutional
          Onboarding Agreement.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          5. Service Suspension and Termination
        </h2>
        <p>
          We reserve the right to suspend tenant access in the event of: (a)
          material breach of acceptable use; (b) prolonged subscription
          non-payment; or (c) reasonable suspicion of security compromise
          threatening other tenants. In the event of subscription termination,
          Subscribing Tenants are provided 30 days to export bibliographic
          records and circulation history in standard formats.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          6. Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by Kenyan law, ComonPlace shall not
          be liable for indirect, incidental, or consequential damages resulting
          from downtime, hardware scanner failure, or lost physical inventory.
          Direct liability is capped at the total subscription fees paid by the
          tenant in the twelve (12) months preceding the incident.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          7. Governing Law and Dispute Resolution
        </h2>
        <p>
          These Terms are governed by and construed under the laws of the
          Republic of Kenya. Any dispute arising out of or in connection with
          these Terms shall first be referred to amicable executive negotiation,
          failing which it shall be resolved by arbitration in Nairobi under the
          Nairobi Centre for International Arbitration (NCIA) rules.
        </p>
      </section>
    </article>
  );
}
