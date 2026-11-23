/**
 * Centralised, typed API endpoint registry.
 *
 * All frontend API paths must be declared here. No magic strings scattered
 * across component files. This registry is the single source of truth for
 * every request the Next.js web app sends to the NestJS API.
 *
 * Usage:
 *   import { ENDPOINTS } from '@/lib/api/endpoints';
 *   const response = await apiClient.get(ENDPOINTS.catalogue.list);
 *   const response = await apiClient.get(ENDPOINTS.catalogue.details('some-id'));
 *
 * Approved platform-scope: INFRA (centralised frontend API endpoint registry)
 */

export const ENDPOINTS = {
  // ─── Authentication (tenant) ──────────────────────────────────────────────
  auth: {
    login: '/api/auth/login',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    changePassword: '/api/auth/change-password',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    sessions: '/api/auth/sessions',
  },

  // ─── Catalogue (CAT-1 to CAT-5) ───────────────────────────────────────────
  catalogue: {
    list: '/api/catalogue',
    create: '/api/catalogue',
    details: (id: string) => `/api/catalogue/${id}`,
    update: (id: string) => `/api/catalogue/${id}`,
    archive: (id: string) => `/api/catalogue/${id}/archive`,
    isbnLookup: (isbn: string) => `/api/catalogue/lookup/${isbn}`,
    copies: (id: string) => `/api/catalogue/${id}/copies`,
    copy: (bookId: string, copyId: string) => `/api/catalogue/${bookId}/copies/${copyId}`,
  },

  // ─── Categories (CAT-5) ───────────────────────────────────────────────────
  categories: {
    list: '/api/categories',
    create: '/api/categories',
    update: (id: string) => `/api/categories/${id}`,
    remove: (id: string) => `/api/categories/${id}`,
  },

  // ─── Search (SRC-1, SRC-2) ────────────────────────────────────────────────
  search: {
    catalogue: '/api/catalogue/search',
  },

  // ─── Circulation (CIR-1 to CIR-6, CIR-9) ─────────────────────────────────
  circulation: {
    checkout: '/api/circulation/checkout',
    checkin: '/api/circulation/checkin',
    renew: '/api/circulation/renew',
    lostDamaged: '/api/circulation/lost-damaged',
    activeLoans: '/api/circulation/loans',
    loan: (id: string) => `/api/circulation/loans/${id}`,
  },

  // ─── Holds (HLD-1 to HLD-3) ───────────────────────────────────────────────
  holds: {
    list: '/api/holds',
    create: '/api/holds',
    cancel: (id: string) => `/api/holds/${id}/cancel`,
    queue: (bookId: string) => `/api/holds/queue/${bookId}`,
  },

  // ─── Fines (FIN-1 to FIN-3) ───────────────────────────────────────────────
  fines: {
    list: '/api/fines',
    create: '/api/fines',
    get: (id: string) => `/api/fines/${id}`,
    pay: (id: string) => `/api/fines/${id}/payment`,
    waive: (id: string) => `/api/fines/${id}/waiver`,
    receipt: (id: string) => `/api/fines/${id}/receipt`,
  },

  // ─── Members (MEM-1, MEM-2, MEM-4) ───────────────────────────────────────
  members: {
    list: '/api/members',
    create: '/api/members',
    get: (id: string) => `/api/members/${id}`,
    update: (id: string) => `/api/members/${id}`,
    borrowingHistory: (id: string) => `/api/members/${id}/loans`,
    activeLoans: (id: string) => `/api/members/${id}/loans/active`,
    fines: (id: string) => `/api/members/${id}/fines`,
  },

  // ─── Member types (MEM-2) ─────────────────────────────────────────────────
  memberTypes: {
    list: '/api/member-types',
    create: '/api/member-types',
    update: (id: string) => `/api/member-types/${id}`,
    remove: (id: string) => `/api/member-types/${id}`,
  },

  // ─── Users / staff (AUTH-4) ───────────────────────────────────────────────
  users: {
    list: '/api/users',
    create: '/api/users',
    get: (id: string) => `/api/users/${id}`,
    update: (id: string) => `/api/users/${id}`,
  },

  // ─── Reports ──────────────────────────────────────────────────────────────
  reports: {
    overview: '/api/reports/overview',
    circulation: '/api/reports/circulation',
    fines: '/api/reports/fines',
    members: '/api/reports/members',
  },

  // ─── Platform Super Admin ─────────────────────────────────────────────────
  platform: {
    // Authentication (separate platform identity, not tenant role)
    login: '/api/platform/auth/login',
    mfaVerify: '/api/platform/auth/mfa/verify',
    refresh: '/api/platform/auth/refresh',
    logout: '/api/platform/auth/logout',
    me: '/api/platform/auth/me',
    sessions: '/api/platform/auth/sessions',

    // Tenant lifecycle management
    tenants: '/api/platform/tenants',
    tenant: (id: string) => `/api/platform/tenants/${id}`,
    tenantStatus: (id: string) => `/api/platform/tenants/${id}/status`,
    tenantAdmins: (id: string) => `/api/platform/tenants/${id}/admins`,
    tenantAdminResetPassword: (tenantId: string, adminId: string) =>
      `/api/platform/tenants/${tenantId}/admins/${adminId}/reset-password`,

    // Platform monitoring & audit
    monitoringStats: '/api/platform/monitoring/stats',
    auditLogs: '/api/platform/audit-logs',
  },

  // ─── Health probes ────────────────────────────────────────────────────────
  health: {
    live: '/health/live',
    ready: '/health/ready',
  },

  // ─── Public (unauthenticated catalogue browsing) ──────────────────────────
  public: {
    libraries: '/api/public/libraries',
    library: (slug: string) => `/api/public/libraries/${slug}`,
    catalogue: (slug: string) => `/api/public/libraries/${slug}/catalogue`,
    catalogueItem: (slug: string, id: string) => `/api/public/libraries/${slug}/catalogue/${id}`,
  },
} as const;

// ─── Type helpers ──────────────────────────────────────────────────────────

/** Extract the type of a static endpoint string from ENDPOINTS */
export type EndpointPath = {
  [K in keyof typeof ENDPOINTS]: {
    [P in keyof (typeof ENDPOINTS)[K]]: (typeof ENDPOINTS)[K][P] extends string
      ? (typeof ENDPOINTS)[K][P]
      : never;
  }[(keyof (typeof ENDPOINTS)[K])];
}[keyof typeof ENDPOINTS];
