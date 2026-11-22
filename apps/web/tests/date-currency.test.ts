import assert from "node:assert";
import { describe, it } from "node:test";
import { formatKes } from "../utils/currency.ts";
import { formatDate, formatTime } from "../utils/date.ts";

describe("Date Utilities (Africa/Nairobi UTC+3 Aware)", () => {
  it("formats UTC ISO timestamps into human-readable Nairobi dates", () => {
    const formatted = formatDate("2026-11-22T07:17:54.806Z");
    // November 22, 2026
    assert.ok(formatted.includes("Nov") || formatted.includes("November"));
    assert.ok(formatted.includes("2026"));
  });

  it("handles null and invalid date inputs safely", () => {
    assert.strictEqual(formatDate(null), "—");
    assert.strictEqual(formatDate(undefined), "—");
    assert.strictEqual(formatDate("invalid-date"), "—");
  });

  it("formats time with minutes", () => {
    const formatted = formatTime("2026-11-22T07:17:54.806Z");
    assert.ok(typeof formatted === "string");
    assert.ok(formatted.length > 0 && formatted !== "—");
  });
});

describe("Currency Utilities (KES Minor Units)", () => {
  it("formats minor units (cents) to KES currency strings", () => {
    assert.strictEqual(formatKes(500), "KES 5.00");
    assert.strictEqual(formatKes(20000), "KES 200.00");
    assert.strictEqual(formatKes(0), "KES 0.00");
  });

  it("handles null and undefined values safely", () => {
    assert.strictEqual(formatKes(null), "KES 0.00");
    assert.strictEqual(formatKes(undefined), "KES 0.00");
  });
});
