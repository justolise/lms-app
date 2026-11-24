import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact ComonPlace — Get in Touch",
  description:
    "Contact the ComonPlace team to learn more about onboarding your library, pricing, support or partnerships.",
};

const CONTACT_CHANNELS = [
  {
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    label: "Email",
    value: "support@commonplace.co.ke",
    href: "mailto:support@commonplace.co.ke",
    description:
      "For general enquiries, onboarding and support. We respond within one business day.",
  },
  {
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </svg>
    ),
    label: "Phone",
    value: "+254 700 000 000",
    href: "tel:+254700000000",
    description: "Call us Monday to Friday, 8:00 AM – 5:00 PM EAT.",
  },
];

const TOPICS = [
  "Onboarding a new library",
  "Pricing and plans",
  "Technical support",
  "Partnership or integration",
  "Press or media enquiry",
  "Other",
];

export default function ContactPage() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="bg-forest-800 py-16 px-4 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-6">
            Contact Us
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            We'd love to hear from you
          </h1>
          <p className="text-white/70">
            Whether you are ready to onboard your library or just exploring, our
            team is happy to help.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Contact info */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">
                Get in touch
              </h2>
              <div className="space-y-5">
                {CONTACT_CHANNELS.map((c) => (
                  <div key={c.label} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 dark:bg-forest-900/30 text-primary">
                      {c.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                        {c.label}
                      </p>
                      <a
                        href={c.href}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {c.value}
                      </a>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {c.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-2">
                Office hours
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Monday – Friday: 8:00 AM – 5:00 PM EAT
                <br />
                Saturday: 9:00 AM – 1:00 PM EAT
                <br />
                Sunday: Closed
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-2">
                Location
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nairobi, Kenya
                <br />
                East Africa
              </p>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
              <h2 className="text-lg font-bold text-foreground mb-6">
                Send us a message
              </h2>
              {/* NOTE: Static form — form submission requires a backend endpoint or third-party form service */}
              {/* This will be wired to an API endpoint or form provider post-v1.0 */}
              <form
                className="space-y-5"
                action="mailto:support@commonplace.co.ke"
                method="get"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-xs font-medium text-foreground mb-1.5"
                    >
                      Full name{" "}
                      <span className="text-danger" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Jane Mwangi"
                      className="block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-medium text-foreground mb-1.5"
                    >
                      Email address{" "}
                      <span className="text-danger" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="jane@school.ac.ke"
                      className="block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="organisation"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Library or institution name
                  </label>
                  <input
                    id="organisation"
                    name="organisation"
                    type="text"
                    autoComplete="organization"
                    placeholder="Westlands Community Library"
                    className="block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="topic"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Topic
                  </label>
                  <select
                    id="topic"
                    name="topic"
                    className="block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  >
                    <option value="">Select a topic…</option>
                    {TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Message{" "}
                    <span className="text-danger" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <textarea
                    id="message"
                    name="body"
                    required
                    rows={5}
                    placeholder="Tell us about your library — how many members, what challenges you are facing, and how we can help…"
                    className="block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors cursor-pointer"
                >
                  Send Message
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  By submitting this form you agree to our{" "}
                  <a
                    href="/legal/privacy-policy"
                    className="underline hover:text-primary"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
