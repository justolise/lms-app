import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For Schools & Libraries — Commonplace",
  description:
    "Commonplace is built for school libraries, public libraries and community reading centres in Kenya and East Africa. Affordable, compliant and easy to operate.",
};

const AUDIENCE = [
  {
    icon: "🏫",
    title: "School libraries",
    body: "Manage student, teacher and staff borrowing. Enforce different loan limits per member type. Send SMS reminders when textbooks are overdue. Integrate seamlessly into your school's daily operations.",
    highlights: ["Per-member-type loan rules", "SMS overdue alerts", "Student & teacher roles", "Barcode scanning on phones"],
  },
  {
    icon: "🏛️",
    title: "Public & community libraries",
    body: "Support a diverse patron base with multiple membership categories. Run holds queues fairly. Accept fine payments and issue receipts. Track your collection with full copy-level inventory.",
    highlights: ["FIFO hold queues", "Fine ledger & receipts", "Full borrowing history", "Multi-copy inventory"],
  },
  {
    icon: "🏢",
    title: "Institution & research libraries",
    body: "Built for libraries that need reliable audit trails, fine-grained access control and structured reporting. KDPA 2019 compliant. Tenant-isolated. Ready for institutional governance requirements.",
    highlights: ["Full audit logs", "Role-based access control", "KDPA 2019 compliant", "Structured reporting"],
  },
];

const WHY_ITEMS = [
  { emoji: "🌍", title: "Designed for East Africa", body: "Africa's Talking SMS integration, Kenya Data Protection Act 2019 compliance, and pricing designed for school and community budgets." },
  { emoji: "☁️", title: "Cloud-hosted, no server needed", body: "Nothing to install. No on-premise servers. Access your library system from any browser, anywhere." },
  { emoji: "📱", title: "Works on any device", body: "Staff can check out books on a phone using the camera as a barcode scanner. No dedicated hardware required to get started." },
  { emoji: "🔒", title: "Your data, protected", body: "Each library is a fully isolated tenant. Row-level security enforced at the database layer. No data ever crosses library boundaries." },
  { emoji: "🛠️", title: "Operated by real librarians", body: "Every workflow was designed with the desk experience in mind. Checkout, return, renewals and holds — all in a few clicks." },
  { emoji: "📞", title: "Local support", body: "We are based in Kenya. Support is available via email and phone during East Africa business hours." },
];

export default function ForSchoolsLibrariesPage() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="bg-forest-800 py-20 px-4 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-6">
            Built For You
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-6">
            The library system East Africa's<br className="hidden sm:block" /> institutions deserve.
          </h1>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
            Professional, affordable library management designed for schools,
            public libraries and community reading centres — from Nairobi to Kisumu
            and beyond.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-3 text-sm font-semibold text-forest-900 shadow-xs transition-colors"
            >
              Talk to Us
            </Link>
            <Link
              href="/features"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              See All Features
            </Link>
          </div>
        </div>
      </section>

      {/* Audience sections */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
            Who uses Commonplace?
          </h2>
          {AUDIENCE.map((a) => (
            <div
              key={a.title}
              className="rounded-2xl border border-border bg-surface p-6 sm:p-8 flex flex-col sm:flex-row gap-6"
            >
              <span className="text-4xl" role="img" aria-label={a.title}>{a.icon}</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-2">{a.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{a.body}</p>
                <ul className="flex flex-wrap gap-2">
                  {a.highlights.map((h) => (
                    <li
                      key={h}
                      className="rounded-full bg-forest-50 dark:bg-forest-900/30 border border-forest-100 dark:border-forest-800 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Commonplace */}
      <section className="bg-surface border-y border-border py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
            Why Commonplace?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_ITEMS.map((w) => (
              <div key={w.title} className="flex flex-col gap-2 p-5 rounded-2xl hover:bg-surface-hover transition-colors">
                <span className="text-2xl" role="img" aria-label={w.title}>{w.emoji}</span>
                <h3 className="text-sm font-bold text-foreground">{w.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Bring your library online
          </h2>
          <p className="text-muted-foreground mb-8">
            Talk to us. We will walk you through onboarding your institution step by step.
          </p>
          <Link
            href="/contact"
            className="inline-flex rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
}
