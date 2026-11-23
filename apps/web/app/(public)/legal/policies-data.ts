export interface PolicyMetadata {
  code: string;
  title: string;
  href: string;
  description: string;
}

export const POLICIES: PolicyMetadata[] = [
  {
    code: "PLAT-POL-01",
    title: "Terms of Service",
    href: "/legal/terms-of-service",
    description:
      "SaaS agreement, tenant obligations, liability & Kenyan jurisdiction",
  },
  {
    code: "PLAT-POL-02",
    title: "Privacy Policy",
    href: "/legal/privacy-policy",
    description:
      "KDPA 2019 compliance, data controller vs processor, patron rights",
  },
  {
    code: "PLAT-POL-03",
    title: "Acceptable Use Policy",
    href: "/legal/acceptable-use",
    description: "System boundaries, permitted conduct & prohibited misuse",
  },
  {
    code: "PLAT-POL-04",
    title: "Cookie & Local Storage Policy",
    href: "/legal/cookies",
    description:
      "Strictly necessary session cookies & zero cross-site trackers",
  },
  {
    code: "PLAT-POL-05",
    title: "Account and Access Policy",
    href: "/legal/account-access",
    description:
      "Role hierarchy, credential standards, timeouts & mandatory MFA",
  },
  {
    code: "PLAT-POL-06",
    title: "Information Security Policy",
    href: "/legal/security",
    description: "Argon2id, AES-256 GCM, PostgreSQL RLS & audit trails",
  },
  {
    code: "PLAT-POL-07",
    title: "Data Retention & Deletion",
    href: "/legal/data-retention",
    description:
      "Audit schedules, patron anonymization & tenant de-provisioning",
  },
  {
    code: "PLAT-POL-08",
    title: "Child & Minor Data Protection",
    href: "/legal/minor-protection",
    description:
      "KDPA Section 33 compliance & strict non-commercial processing",
  },
  {
    code: "PLAT-POL-09",
    title: "Availability & Support SLA",
    href: "/legal/sla",
    description: "99.5% uptime target, maintenance windows & incident response",
  },
];
