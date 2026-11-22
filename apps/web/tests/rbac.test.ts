import assert from "node:assert";
import { describe, it } from "node:test";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "../lib/auth/permission-helpers.ts";
import { PERMISSIONS } from "../lib/auth/permissions.ts";

describe("RBAC Permissions Architecture", () => {
  it("maps ADMIN role to all critical permissions", () => {
    assert.strictEqual(hasPermission("ADMIN", PERMISSIONS.USERS_PROMOTE), true);
    assert.strictEqual(
      hasPermission("ADMIN", PERMISSIONS.USERS_INVITE_LIBRARIAN),
      true,
    );
    assert.strictEqual(
      hasPermission("ADMIN", PERMISSIONS.CIRCULATION_CHECKOUT),
      true,
    );
    assert.strictEqual(
      hasPermission("ADMIN", PERMISSIONS.CATALOGUE_CREATE),
      true,
    );
    assert.strictEqual(
      hasPermission("ADMIN", PERMISSIONS.LOAN_POLICIES_MANAGE),
      true,
    );
  });

  it("restricts LIBRARIAN from promoting users to admin", () => {
    assert.strictEqual(
      hasPermission("LIBRARIAN", PERMISSIONS.USERS_PROMOTE),
      false,
    );
    assert.strictEqual(
      hasPermission("LIBRARIAN", PERMISSIONS.CIRCULATION_CHECKOUT),
      true,
    );
    assert.strictEqual(
      hasPermission("LIBRARIAN", PERMISSIONS.CIRCULATION_RETURN),
      true,
    );
    assert.strictEqual(
      hasPermission("LIBRARIAN", PERMISSIONS.CATALOGUE_CREATE),
      true,
    );
  });

  it("restricts MEMBER to catalogue read, own loans, and own profile", () => {
    assert.strictEqual(
      hasPermission("MEMBER", PERMISSIONS.CATALOGUE_READ),
      true,
    );
    assert.strictEqual(
      hasPermission("MEMBER", PERMISSIONS.LOANS_READ_OWN),
      true,
    );
    assert.strictEqual(
      hasPermission("MEMBER", PERMISSIONS.PROFILE_MANAGE_OWN),
      true,
    );
    assert.strictEqual(
      hasPermission("MEMBER", PERMISSIONS.CIRCULATION_CHECKOUT),
      false,
    );
    assert.strictEqual(
      hasPermission("MEMBER", PERMISSIONS.CATALOGUE_CREATE),
      false,
    );
    assert.strictEqual(
      hasPermission("MEMBER", PERMISSIONS.USERS_DIRECTORY_READ),
      false,
    );
  });

  it("restricts GUEST to catalogue and categories read only", () => {
    assert.strictEqual(
      hasPermission("GUEST", PERMISSIONS.CATALOGUE_READ),
      true,
    );
    assert.strictEqual(
      hasPermission("GUEST", PERMISSIONS.CATEGORIES_READ),
      true,
    );
    assert.strictEqual(
      hasPermission("GUEST", PERMISSIONS.PROFILE_MANAGE_OWN),
      false,
    );
    assert.strictEqual(
      hasPermission("GUEST", PERMISSIONS.CIRCULATION_CHECKOUT),
      false,
    );
  });

  it("evaluates hasAnyPermission correctly", () => {
    const permissions = [
      PERMISSIONS.CIRCULATION_CHECKOUT,
      PERMISSIONS.CATALOGUE_READ,
    ];
    assert.strictEqual(hasAnyPermission("MEMBER", permissions), true);
    assert.strictEqual(
      hasAnyPermission("GUEST", [
        PERMISSIONS.CIRCULATION_CHECKOUT,
        PERMISSIONS.USERS_PROMOTE,
      ]),
      false,
    );
  });

  it("evaluates hasAllPermissions correctly", () => {
    assert.strictEqual(
      hasAllPermissions("ADMIN", [
        PERMISSIONS.CIRCULATION_CHECKOUT,
        PERMISSIONS.USERS_PROMOTE,
      ]),
      true,
    );
    assert.strictEqual(
      hasAllPermissions("LIBRARIAN", [
        PERMISSIONS.CIRCULATION_CHECKOUT,
        PERMISSIONS.USERS_PROMOTE,
      ]),
      false,
    );
  });

  it("returns false for null or undefined roles safely", () => {
    assert.strictEqual(hasPermission(null, PERMISSIONS.CATALOGUE_READ), false);
    assert.strictEqual(
      hasPermission(undefined, PERMISSIONS.CATALOGUE_READ),
      false,
    );
  });
});
