import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Availability & Support SLA (PLAT-POL-09) — Commonplace",
  description:
    "99.5% uptime commitment, maintenance windows and technical support response standards.",
};

export default function SlaPage() {
  return (
    <article className="prose dark:prose-invert max-w-none text-foreground text-sm leading-relaxed space-y-6">
      <header className="border-b border-border pb-5 not-prose space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            PLAT-POL-09
          </span>
          <span className="text-xs text-muted-foreground">
            Effective Date: November 24, 2026
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Platform Availability &amp; Support SLA
        </h1>
        <p className="text-xs text-muted-foreground">
          Applicability: Subscribing Institutional Libraries and Service
          Delivery Management
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          1. Uptime Commitment (99.5% Target)
        </h2>
        <p>
          Commonplace commits to delivering a minimum monthly operational
          availability of <strong>99.5%</strong>, excluding scheduled
          maintenance windows. Uptime is continuously validated via automated
          health probes (<code>/health/live</code> and{" "}
          <code>/health/ready</code>) monitoring database and Redis
          availability.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          2. Scheduled Maintenance Windows
        </h2>
        <p>
          To maintain zero disruption during peak school and library operating
          hours, planned infrastructure updates and database migrations occur
          strictly within off-peak windows:
        </p>
        <p className="font-semibold text-foreground">
          Sundays: 01:00 AM – 04:00 AM East Africa Time (EAT).
        </p>
        <p>
          Subscribing library administrators are provided at least 48 hours
          advance notice for any non-routine maintenance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          3. Incident Severity and Response Targets
        </h2>
        <div className="overflow-x-auto not-prose">
          <table className="w-full text-left border-collapse border border-border text-xs">
            <thead>
              <tr className="bg-surface-hover border-b border-border">
                <th className="p-2.5 font-bold text-foreground">
                  Severity Level
                </th>
                <th className="p-2.5 font-bold text-foreground">Definition</th>
                <th className="p-2.5 font-bold text-foreground">
                  Target Initial Response
                </th>
                <th className="p-2.5 font-bold text-foreground">
                  Target Workaround/Fix
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-2.5 font-semibold text-danger">
                  P1: Critical Outage
                </td>
                <td className="p-2.5">
                  Total platform outage or checkout desk halted across multiple
                  branches.
                </td>
                <td className="p-2.5 font-bold">&le; 1 Hour</td>
                <td className="p-2.5">&le; 4 Hours</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-amber-600">
                  P2: Major Degradation
                </td>
                <td className="p-2.5">
                  Key subsystem unavailable (e.g. holds queue or fine payments),
                  but circulation operates.
                </td>
                <td className="p-2.5">&le; 4 Hours</td>
                <td className="p-2.5">&le; 12 Hours</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-primary">
                  P3: Minor Issue
                </td>
                <td className="p-2.5">
                  Cosmetic bug, report formatting glitch, or non-blocking
                  inquiry.
                </td>
                <td className="p-2.5">&le; 1 Business Day</td>
                <td className="p-2.5">Next release cycle</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          4. Support Channels and Hours
        </h2>
        <p>
          Technical support is available to authorized library administrators
          and librarians via email at <code>support@commonplace.co.ke</code> and
          telephone at <code>+254 700 000 000</code> during regular East African
          business hours (Monday through Friday, 8:00 AM &ndash; 5:00 PM EAT).
          Critical P1 incidents are monitored 24/7/365.
        </p>
      </section>
    </article>
  );
}
