import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Features — ComonPlace Library Management System",
  description:
    "Full-featured library management: circulation, catalogue, holds, fines, member management, notifications and more — built for schools and community libraries.",
};

const FEATURES = [
  {
    category: "Catalogue",
    items: [
      {
        icon: "📖",
        title: "Bibliographic records",
        body: "Create, edit and archive book and resource records. Supports multiple copies per title, each with a unique barcode.",
      },
      {
        icon: "🔍",
        title: "ISBN lookup & autofill",
        body: "Scan or enter an ISBN and ComonPlace fetches title, author, cover and classification data automatically from Open Library and Google Books.",
      },
      {
        icon: "🏷️",
        title: "Categories, subjects & call numbers",
        body: "Full Dewey-style shelf classification with custom categories, subjects and location labels.",
      },
    ],
  },
  {
    category: "Circulation",
    items: [
      {
        icon: "📤",
        title: "Checkout & return",
        body: "Issue loans by scanning a member card and item barcode. Overdue detection and fine calculation happen automatically on return.",
      },
      {
        icon: "🔄",
        title: "Renewals",
        body: "Configurable renewal limits per member and item type. Holds on a title automatically block renewal to protect the queue.",
      },
      {
        icon: "📱",
        title: "Camera barcode scanning",
        body: "Staff on mobile devices can use the device camera as a barcode or QR scanner — no dedicated hardware required.",
      },
      {
        icon: "🔧",
        title: "Lost & damaged workflows",
        body: "Mark a copy as Lost or Damaged, automatically post a replacement charge to the patron ledger and transition the copy status — all in one workflow.",
      },
    ],
  },
  {
    category: "Holds & Reservations",
    items: [
      {
        icon: "🔖",
        title: "FIFO hold queue",
        body: "Members or staff can place holds on checked-out titles. Holds are served in strict first-in-first-out order.",
      },
      {
        icon: "🔔",
        title: "Hold-ready notifications",
        body: "When a copy arrives for a waiting patron, they receive an automatic email or SMS. Configurable expiry clears uncollected holds.",
      },
    ],
  },
  {
    category: "Fines & Payments",
    items: [
      {
        icon: "💳",
        title: "Fine ledger & payments",
        body: "Every patron has an audited fine ledger. Record full or partial payments. Librarians can apply authorised waivers with a mandatory reason.",
      },
      {
        icon: "🧾",
        title: "Payment receipts",
        body: "Generate a printable receipt for each payment transaction for patron records.",
      },
    ],
  },
  {
    category: "Members & Access",
    items: [
      {
        icon: "👤",
        title: "Member profiles & types",
        body: "Rich member records with configurable member types (Student, Teacher, Staff, Community) each with their own borrowing limits and loan periods.",
      },
      {
        icon: "🛡️",
        title: "Role-based access control",
        body: "Admin, Librarian, Teacher, Member and Parent roles with clearly defined permissions. Checkout blocks prevent loans when balances are outstanding.",
      },
      {
        icon: "📜",
        title: "Borrowing history",
        body: "Full audit trail of every loan, return, renewal and fine event for each member.",
      },
    ],
  },
  {
    category: "Notifications",
    items: [
      {
        icon: "✉️",
        title: "Email notifications",
        body: "Automated emails for due-date reminders, overdue alerts, hold-ready notices and fine statements.",
      },
      {
        icon: "💬",
        title: "SMS via Africa's Talking",
        body: "SMS notifications for libraries whose members are more reliably reached by text. Configurable per-event.",
      },
    ],
  },
  {
    category: "Platform & Operations",
    items: [
      {
        icon: "🏢",
        title: "Multi-tenant SaaS",
        body: "Each library is a fully isolated tenant. Data never crosses tenant boundaries. Row-level security enforced at the database layer.",
      },
      {
        icon: "📊",
        title: "Dashboard & reporting",
        body: "Circulation summaries, fine totals, most-borrowed titles and member activity — at a glance.",
      },
      {
        icon: "❤️",
        title: "Health monitoring",
        body: "Built-in liveness and readiness probes, structured request logging and correlation IDs for every request.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="bg-forest-800 py-20 px-4 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-6">
            v1.0 Feature Set
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-6">
            Everything a library needs.
            <br className="hidden sm:block" /> Nothing it doesn't.
          </h1>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
            ComonPlace covers the full circulation lifecycle — from cataloguing
            a new acquisition to collecting an overdue fine — in a single,
            integrated platform.
          </p>
        </div>
      </section>

      {/* Feature grid by category */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-16">
          {FEATURES.map((group) => (
            <div key={group.category}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-primary mb-6">
                {group.category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {group.items.map((f) => (
                  <div
                    key={f.title}
                    className="rounded-2xl border border-border bg-surface p-6 space-y-3"
                  >
                    <span className="text-2xl" role="img" aria-label={f.title}>
                      {f.icon}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {f.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface border-t border-border py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8">
            Contact us to onboard your library or browse our public catalogue
            demo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors"
            >
              Contact Us
            </Link>
            <Link
              href="/browse"
              className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-surface-hover transition-colors"
            >
              Browse Catalogue
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
