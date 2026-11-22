export const PERMISSIONS = {
  // Catalogue & Categories
  CATALOGUE_READ: "catalogue:read",
  CATALOGUE_CREATE: "catalogue:create",
  CATALOGUE_EDIT: "catalogue:edit",
  CATALOGUE_ARCHIVE: "catalogue:archive",
  COPIES_MANAGE: "copies:manage",
  COPIES_WITHDRAW: "copies:withdraw",
  CATEGORIES_READ: "categories:read",
  CATEGORIES_MANAGE: "categories:manage",
  CATEGORIES_DELETE: "categories:delete",

  // Circulation
  CIRCULATION_CHECKOUT: "circulation:checkout",
  CIRCULATION_RETURN: "circulation:return",
  CIRCULATION_RENEW: "circulation:renew",
  CIRCULATION_OVERRIDE: "circulation:override",
  LOANS_READ_OWN: "loans:read_own",
  LOANS_READ_ALL: "loans:read_all",

  // Members & Loan Policies
  MEMBERS_READ: "members:read",
  MEMBERS_CREATE: "members:create",
  MEMBER_TYPES_READ: "member_types:read",
  MEMBER_TYPES_MANAGE: "member_types:manage",
  LOAN_POLICIES_MANAGE: "loan_policies:manage",

  // Staff User Directory & Administration
  USERS_DIRECTORY_READ: "users:directory_read",
  USERS_INVITE_LIBRARIAN: "users:invite_librarian",
  USERS_PROMOTE: "users:promote",
  USERS_TOGGLE_STATUS: "users:toggle_status",

  // Holds & Reservations (HLD-1, HLD-2, HLD-3)
  HOLDS_PLACE: "holds:place",
  HOLDS_READ_OWN: "holds:read_own",
  HOLDS_READ_ALL: "holds:read_all",
  HOLDS_CANCEL_OWN: "holds:cancel_own",
  HOLDS_CANCEL_ANY: "holds:cancel_any",

  // Profile & Self-Service
  PROFILE_MANAGE_OWN: "profile:manage_own",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
