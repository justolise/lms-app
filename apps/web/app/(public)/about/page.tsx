import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Commonplace — Modern Library Management",
  description:
    "Learn how Commonplace is building modern library infrastructure for schools, community libraries and institutions across Kenya and East Africa.",
};

export default function AboutPage() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="bg-forest-800 py-20 px-4 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-6">
            Our Story
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-6">
            Modern library management
            <br className="hidden sm:block" /> for a world of knowledge.
          </h1>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            Commonplace was built for the librarians, teachers and
            administrators who keep the doors of knowledge open every day — in
            schools, community centres and public institutions across East
            Africa.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Why we built this
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Libraries are among the most democratising institutions on earth.
              A well-run library gives every reader — regardless of background —
              access to the same knowledge as anyone else. Yet many libraries in
              Kenya and East Africa still operate on paper ledgers, ageing
              spreadsheets or disconnected tools that create more work than they
              solve.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Commonplace changes that. We provide a professional, cloud-hosted
              library management platform designed specifically for the
              realities of East African institutions: low-bandwidth
              environments, local payment systems, SMS-first communication and
              Kenya Data Protection Act 2019 compliance built in from day one.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              { value: "v1.0", label: "Current Release" },
              { value: "KDPA", label: "2019 Compliant" },
              { value: "Multi-tenant", label: "SaaS Platform" },
              { value: "East Africa", label: "Built For" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-surface p-5 text-center"
              >
                <p className="text-xl font-bold text-primary">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-surface border-y border-border py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
            What we stand for
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                icon: "📚",
                title: "Access for everyone",
                body: "Libraries work best when every member of a community can walk through the doors — physical or digital. We build tools that lower the barrier.",
              },
              {
                icon: "🔒",
                title: "Privacy by design",
                body: "Member data is not a product. All patron information is encrypted at rest, tenant-isolated and compliant with KDPA 2019.",
              },
              {
                icon: "⚡",
                title: "Built to last",
                body: "We write production-grade software. No prototypes. No shortcuts. Librarians deserve tools that work reliably every day.",
              },
            ].map((v) => (
              <div key={v.title} className="flex flex-col items-start gap-3">
                <span className="text-3xl" role="img" aria-label={v.title}>
                  {v.icon}
                </span>
                <h3 className="text-base font-bold text-foreground">
                  {v.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Ready to bring your library online?
          </h2>
          <p className="text-muted-foreground mb-8">
            Talk to us about onboarding your institution to Commonplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors"
            >
              Contact Us
            </Link>
            <Link
              href="/features"
              className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-surface-hover transition-colors"
            >
              See All Features
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
