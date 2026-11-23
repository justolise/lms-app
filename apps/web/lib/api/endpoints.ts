/**
 * Centralised, typed API endpoint registry.
 *
 * ALL API paths in this codebase must be declared here.
 * No hardcoded "/api/..." strings anywhere else — import from this file.
 *
 * Usage:
 *   import { ENDPOINTS } from '@/lib/api/endpoints';
 *   await apiClient.get(ENDPOINTS.catalogue.list);
 *   await apiClient.get(ENDPOINTS.catalogue.details('some-id'));
 *
 * Approved platform-scope: INFRA (centralised frontend API endpoint registry)
 */

export const ENDPOINTS = {
  // ─── Authentication (tenant) ──────────────────────────────────────────────
  auth: {
    login: '/api/auth/login',
    selectMembership: '/api/auth/select-membership',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    changePassword: '/api/auth/change-password',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    sessions: '/api/auth/sessions',
    session: (sessionId: string) => `/api/auth/sessions/${sessionId}`,
  },

  // ─── User profile (authenticated user's own profile) ─────────────────────
  profile: {
    get: '/api/profile',
    update: '/api/profile',
    delete: '/api/profile',
  },

  // ─── Admin (library tenant admin operations) ──────────────────────────────
  admin: {
    profile: '/api/admin/profile',
  },

  // ─── Catalogue (CAT-1 to CAT-5) ───────────────────────────────────────────
  catalogue: {
    list: '/api/catalogue',
    search: '/api/catalogue/search',
    create: '/api/catalogue',
    details: (id: string) => `/api/catalogue/${id}`,
    update: (id: string) => `/api/catalogue/${id}`,
    archive: (id: string) => `/api/catalogue/${id}`,
    isbnLookup: '/api/catalogue/isbn-lookup',
    copies: (bookId: string) => `/api/catalogue/${bookId}/copies`,
    copyStatus: (bookId: string, copyId: string) =>
      `/api/catalogue/${bookId}/copies/${copyId}/status`,
    withdrawCopy: (bookId: string, copyId: string) =>
      `/api/catalogue/${bookId}/copies/${copyId}`,
  },

  // ─── Categories (CAT-5) ───────────────────────────────────────────────────
  categories: {
    list: '/api/categories',
    create: '/api/categories',
    update: (id: string) => `/api/categories/${id}`,
    remove: (id: string) => `/api/categories/${id}`,
  },

  // ─── Circulation (CIR-1 to CIR-6, CIR-9) ─────────────────────────────────
  circulation: {
    checkout: '/api/circulation/checkout',
    return: '/api/circulation/return',
    renew: (loanId: string) => `/api/circulation/renew/${loanId}`,
    lostDamaged: '/api/circulation/lost-damaged',
    loans: '/api/circulation/loans',
    loan: (id: string) => `/api/circulation/loans/${id}`,
  },

  // ─── Holds (HLD-1 to HLD-3) ───────────────────────────────────────────────
  holds: {
    list: '/api/holds',
    create: '/api/holds',
    cancel: (id: string) => `/api/holds/${id}`,
    queue: (bookId: string) => `/api/holds/queue/${bookId}`,
  },

  // ─── Fines (FIN-1 to FIN-3) ───────────────────────────────────────────────
  fines: {
    ledger: '/api/fines/ledger',
    balance: (userId: string) => `/api/fines/balance/${userId}`,
    payments: '/api/fines/payments',
    waivers: '/api/fines/waivers',
    receipt: (entryId: string) => `/api/fines/receipts/${entryId}`,
  },

  // ─── Members (MEM-1, MEM-2, MEM-4) ───────────────────────────────────────
  members: {
    list: '/api/members',
    create: '/api/members',
    types: '/api/members/types',
    get: (id: string) => `/api/members/${id}`,
    update: (id: string) => `/api/members/${id}`,
    loans: (id: string) => `/api/members/${id}/loans`,
    fines: (id: string) => `/api/members/${id}/fines`,
    enquiries: '/api/members/enquiries',
    reviewEnquiry: (id: string) => `/api/members/enquiries/${id}/review`,
  },

  // ─── Member types (MEM-2, CIR-4) ─────────────────────────────────────────
  memberTypes: {
    list: '/api/member-types',
    get: (id: string) => `/api/member-types/${id}`,
    create: '/api/member-types',
    update: (id: string) => `/api/member-types/${id}`,
    policies: (typeId: string) => `/api/member-types/${typeId}/policies`,
    policy: (typeId: string, policyId: string) =>
      `/api/member-types/${typeId}/policies/${policyId}`,
  },

  // ─── Users / staff (AUTH-4) ───────────────────────────────────────────────
  users: {
    list: '/api/users',
    librarians: '/api/users/librarians',
    get: (id: string) => `/api/users/${id}`,
    update: (id: string) => `/api/users/${id}`,
    promote: (id: string) => `/api/users/${id}/promote`,
  },

  // ─── Reports ──────────────────────────────────────────────────────────────
  reports: {
    dashboard: '/api/reports/dashboard',
    overview: '/api/reports/overview',
    circulation: '/api/reports/circulation',
    fines: '/api/reports/fines',
    members: '/api/reports/members',
  },

  // ─── Platform Super Admin (separate identity — NOT a tenant role) ─────────
  platform: {
    // Authentication
    login: '/api/platform/auth/login',
    mfaVerify: '/api/platform/auth/mfa/verify',
    refresh: '/api/platform/auth/refresh',
    logout: '/api/platform/auth/logout',
    me: '/api/platform/auth/me',
    sessions: '/api/platform/auth/sessions',
    session: (id: string) => `/api/platform/auth/sessions/${id}`,

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
    catalogueItem: (slug: string, id: string) =>
      `/api/public/libraries/${slug}/catalogue/${id}`,
    membershipRequest: (slug: string) =>
      `/api/public/libraries/${slug}/membership-requests`,
    // Legacy flat catalogue browse (no slug)
    browseCatalogue: '/api/public/catalogue',
  },
} as const;

// ─── Type helpers ──────────────────────────────────────────────────────────

/** Extract all static (non-function) endpoint strings from ENDPOINTS */
export type StaticEndpointPath = {
  [K in keyof typeof ENDPOINTS]: {
    [P in keyof (typeof ENDPOINTS)[K]]: (typeof ENDPOINTS)[K][P] extends string
      ? (typeof ENDPOINTS)[K][P]
      : never;
  }[keyof (typeof ENDPOINTS)[K]];
}[keyof typeof ENDPOINTS];
