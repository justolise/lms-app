import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Privacy Policy (PLAT-POL-02) — ComonPlace",
  description:
    "Kenya Data Protection Act (KDPA 2019) compliance and patron data handling practices.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="prose dark:prose-invert max-w-none text-foreground text-sm leading-relaxed space-y-6">
      <header className="border-b border-border pb-5 not-prose space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            PLAT-POL-02
          </span>
          <span className="text-xs text-muted-foreground">
            Effective Date: November 24, 2026
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Platform Privacy Policy (KDPA 2019)
        </h1>
        <p className="text-xs text-muted-foreground">
          Framework: Kenya Data Protection Act, 2019 | Office of the Data
          Protection Commissioner (ODPC)
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          1. Data Controller vs. Data Processor Roles
        </h2>
        <p>
          Under the <strong>Kenya Data Protection Act, 2019 (KDPA)</strong>:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            <strong>The Subscribing Library/School</strong> is the{" "}
            <strong>Data Controller</strong>. The library determines the purpose
            and lawful basis for collecting patron names, phone numbers,
            national/student IDs, and circulation history.
          </li>
          <li>
            <strong>ComonPlace</strong> is the <strong>Data Processor</strong>.
            We process patron information strictly in accordance with the
            Controller&rsquo;s instructions and our SaaS Service Agreement.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          2. Categories of Data Collected and Processed
        </h2>
        <p>
          ComonPlace processes only data necessary for library circulation and
          educational accountability:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            <strong>Staff Data:</strong> Full name, institutional email address,
            phone number, role, hashed credentials, and session logs.
          </li>
          <li>
            <strong>Patron Data:</strong> Full name, library card barcode,
            encrypted national/student ID number, email address, phone number,
            and member classification.
          </li>
          <li>
            <strong>Circulation &amp; Financial Data:</strong> Checkouts,
            returns, renewal timestamps, hold queues, accrued late fines, waiver
            reasons, and payment receipt numbers.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          3. Security and Technical Safeguards
        </h2>
        <p>
          In compliance with Section 41 of the KDPA, ComonPlace implements
          robust technical controls:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            <strong>Encryption at Rest:</strong> Sensitive member identifiers
            (e.g. National ID / Student ID) are encrypted using AES-256-GCM.
          </li>
          <li>
            <strong>Credential Security:</strong> Passwords are protected using
            Argon2id with strict computational memory/time constraints.
          </li>
          <li>
            <strong>Encryption in Transit:</strong> All HTTP traffic is
            protected by TLS 1.3 with HSTS preloaded.
          </li>
          <li>
            <strong>Database Isolation:</strong> PostgreSQL Row-Level Security
            (RLS) ensures no tenant or patron data can ever be read across
            tenant boundaries.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          4. Borrowing History Confidentiality
        </h2>
        <p>
          Reading and inquiry records are protected under library
          confidentiality ethics and constitutional privacy rights. ComonPlace
          does not sell, profile, or monetize patron borrowing histories.
          Borrowing logs are accessible only to authorized library staff for
          circulation management and inventory tracking.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          5. Data Subject Rights (KDPA Part IV)
        </h2>
        <p>
          Patrons are entitled to exercise their statutory rights under the
          KDPA, including: (a) right to be informed; (b) right of access; (c)
          right to rectification; and (d) right to erasure or object to
          processing. Patrons must submit requests directly to their
          institutional library (the Controller). ComonPlace provides automated
          software tools enabling librarians to fulfill access or correction
          requests.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          6. Contact and Complaints
        </h2>
        <p>
          Inquiries concerning platform data handling may be addressed to:{" "}
          <code>support@commonplace.co.ke</code>. Patrons or institutions also
          maintain the legal right to lodge complaints with the{" "}
          <strong>Office of the Data Protection Commissioner (ODPC)</strong>,
          Nairobi, Kenya.
        </p>
      </section>
    </article>
  );
}
