import {
	ForbiddenException,
	NotFoundException,
	UnprocessableEntityException,
} from "@nestjs/common";
import { describe, expect, it, type Mock, vi } from "vitest";
import type { DatabaseService } from "../database/database.service.js";
import { HoldsService } from "./holds.service.js";

const TENANT = "aaaaaaaa-0000-0000-0000-000000000001";
const ACTOR = "aaaaaaaa-0000-0000-0000-000000000002";
const USER_ID = "aaaaaaaa-0000-0000-0000-000000000003";
const OTHER_USER = "aaaaaaaa-0000-0000-0000-000000000099";
const TITLE_ID = "aaaaaaaa-0000-0000-0000-000000000006";
const COPY_ID = "aaaaaaaa-0000-0000-0000-000000000004";
const HOLD_ID = "aaaaaaaa-0000-0000-0000-000000000010";

function makeMockTx(sequences: {
	selects?: unknown[][];
	update?: unknown[];
	insert?: unknown[];
}) {
	let idx = 0;

	function queryChain(result: unknown[]) {
		const q: Record<string, unknown> = {
			from: () => q,
			leftJoin: () => q,
			innerJoin: () => q,
			where: () => q,
			orderBy: () => q,
			limit: () => Promise.resolve(result),
			then: (
				resolve: (v: unknown) => unknown,
				reject?: (e: unknown) => unknown,
			) => Promise.resolve(result).then(resolve, reject),
		};
		return q;
	}

	return {
		select: vi.fn((_fields?: unknown) => {
			const result = sequences.selects?.[idx++] ?? [];
			return queryChain(result);
		}),
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(() => ({
					returning: vi.fn().mockResolvedValue(sequences.update ?? []),
				})),
			})),
		})),
		insert: vi.fn(() => ({
			values: vi.fn(() => ({
				returning: vi.fn().mockResolvedValue(sequences.insert ?? [{}]),
			})),
		})),
	};
}

function makeDb(sequences: {
	selects?: unknown[][];
	update?: unknown[];
	insert?: unknown[];
}) {
	const mockTx = makeMockTx(sequences);
	return {
		withTenant: vi.fn(
			(_tenantId: string, fn: (tx: typeof mockTx) => Promise<unknown>) =>
				fn(mockTx),
		),
		mockTx,
	} as unknown as { withTenant: Mock; mockTx: ReturnType<typeof makeMockTx> };
}

describe("HoldsService", () => {
	describe("placeHold (HLD-1)", () => {
		it("throws NotFoundException when target user is not found", async () => {
			const db = makeDb({ selects: [[]] });
			const service = new HoldsService(db as unknown as DatabaseService);

			await expect(
				service.placeHold(TENANT, ACTOR, "MEMBER", {
					catalogueItemId: TITLE_ID,
				}),
			).rejects.toThrow(NotFoundException);
		});

		it("throws UnprocessableEntityException when user is suspended", async () => {
			const db = makeDb({
				selects: [
					[{ id: ACTOR, status: "SUSPENDED", fullName: "Suspended Patron" }],
				],
			});
			const service = new HoldsService(db as unknown as DatabaseService);

			await expect(
				service.placeHold(TENANT, ACTOR, "MEMBER", {
					catalogueItemId: TITLE_ID,
				}),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it("throws NotFoundException when catalogue title is not found", async () => {
			const db = makeDb({
				selects: [
					[{ id: ACTOR, status: "ACTIVE", fullName: "Active Patron" }],
					[], // Title not found
				],
			});
			const service = new HoldsService(db as unknown as DatabaseService);

			await expect(
				service.placeHold(TENANT, ACTOR, "MEMBER", {
					catalogueItemId: TITLE_ID,
				}),
			).rejects.toThrow(NotFoundException);
		});

		it("throws UnprocessableEntityException when available copies > 0 (HLD-1)", async () => {
			const db = makeDb({
				selects: [
					[{ id: ACTOR, status: "ACTIVE", fullName: "Active Patron" }],
					[{ id: TITLE_ID, title: "Clean Code", status: "ACTIVE" }],
					[{ id: COPY_ID }], // available copies exist
				],
			});
			const service = new HoldsService(db as unknown as DatabaseService);

			await expect(
				service.placeHold(TENANT, ACTOR, "MEMBER", {
					catalogueItemId: TITLE_ID,
				}),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it("throws UnprocessableEntityException when patron already has the title on loan (HLD-1)", async () => {
			const db = makeDb({
				selects: [
					[{ id: ACTOR, status: "ACTIVE", fullName: "Active Patron" }],
					[{ id: TITLE_ID, title: "Clean Code", status: "ACTIVE" }],
					[], // 0 available copies
					[{ id: "existing-loan-id" }], // existing loan
				],
			});
			const service = new HoldsService(db as unknown as DatabaseService);

			await expect(
				service.placeHold(TENANT, ACTOR, "MEMBER", {
					catalogueItemId: TITLE_ID,
				}),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it("throws UnprocessableEntityException when patron already has an active hold (HLD-1)", async () => {
			const db = makeDb({
				selects: [
					[{ id: ACTOR, status: "ACTIVE", fullName: "Active Patron" }],
					[{ id: TITLE_ID, title: "Clean Code", status: "ACTIVE" }],
					[], // 0 available copies
					[], // 0 existing loans
					[{ id: "existing-hold-id", status: "PENDING" }], // existing hold
				],
			});
			const service = new HoldsService(db as unknown as DatabaseService);

			await expect(
				service.placeHold(TENANT, ACTOR, "MEMBER", {
					catalogueItemId: TITLE_ID,
				}),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it("successfully places hold and computes queue position (HLD-1)", async () => {
			const placedAt = new Date();
			const mockHold = {
				id: HOLD_ID,
				tenantId: TENANT,
				userId: ACTOR,
				catalogueItemId: TITLE_ID,
				status: "PENDING",
				pickupWindowHours: 72,
				placedAt,
			};

			const db = makeDb({
				selects: [
					[{ id: ACTOR, status: "ACTIVE", fullName: "Active Patron" }],
					[{ id: TITLE_ID, title: "Clean Code", status: "ACTIVE" }],
					[], // 0 available copies
					[], // 0 existing loans
					[], // 0 existing holds
					[{ id: HOLD_ID }], // older holds count = 1
				],
				insert: [mockHold],
			});
			const service = new HoldsService(db as unknown as DatabaseService);

			const result = await service.placeHold(TENANT, ACTOR, "MEMBER", {
				catalogueItemId: TITLE_ID,
			});

			expect(result.id).toBe(HOLD_ID);
			expect(result.status).toBe("PENDING");
			expect(result.queuePosition).toBe(1);
			expect(result.bookTitle).toBe("Clean Code");
		});
	});

	describe("fulfillNextHoldOnReturn (HLD-2)", () => {
		it("sets copy to AVAILABLE when no PENDING holds exist", async () => {
			const db = makeDb({
				selects: [[]], // no pending holds
				update: [],
			});
			const service = new HoldsService(db as unknown as DatabaseService);

			const result = await service.fulfillNextHoldOnReturn(
				db.mockTx as any,
				TENANT,
				TITLE_ID,
				COPY_ID,
			);

			expect(result.holdFulfilled).toBe(false);
			expect(db.mockTx.update).toHaveBeenCalled();
		});

		it("sets oldest hold to READY and copy to ON_HOLD when PENDING hold exists (HLD-2)", async () => {
			const now = new Date();
			const pendingHold = {
				id: HOLD_ID,
				tenantId: TENANT,
				userId: USER_ID,
				catalogueItemId: TITLE_ID,
				status: "PENDING",
				pickupWindowHours: 72,
				placedAt: now,
			};
			const readyHold = {
				...pendingHold,
				status: "READY",
				copyId: COPY_ID,
			};

			const db = makeDb({
				selects: [[pendingHold]],
				update: [readyHold],
			});
			const service = new HoldsService(db as unknown as DatabaseService);

			const result = await service.fulfillNextHoldOnReturn(
				db.mockTx as any,
				TENANT,
				TITLE_ID,
				COPY_ID,
			);

			expect(result.holdFulfilled).toBe(true);
			expect(result.claimantUserId).toBe(USER_ID);
			expect(result.expiresAt).toBeInstanceOf(Date);
			expect(db.mockTx.update).toHaveBeenCalledTimes(2); // hold update + copy update
		});
	});

	describe("verifyClaimantForCheckout & fulfillHoldOnCheckout (CIR-1)", () => {
		it("returns holdId: null when copy is not reserved", async () => {
			const db = makeDb({ selects: [[]] });
			const service = new HoldsService(db as unknown as DatabaseService);

			const res = await service.verifyClaimantForCheckout(
				db.mockTx as any,
				TENANT,
				COPY_ID,
				USER_ID,
			);
			expect(res.holdId).toBeNull();
		});

		it("throws UnprocessableEntityException when copy is reserved for another user", async () => {
			const db = makeDb({
				selects: [[{ id: HOLD_ID, userId: OTHER_USER }]],
			});
			const service = new HoldsService(db as unknown as DatabaseService);

			await expect(
				service.verifyClaimantForCheckout(
					db.mockTx as any,
					TENANT,
					COPY_ID,
					USER_ID,
				),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it("returns holdId when claimant matches reservation", async () => {
			const db = makeDb({
				selects: [[{ id: HOLD_ID, userId: USER_ID }]],
			});
			const service = new HoldsService(db as unknown as DatabaseService);

			const res = await service.verifyClaimantForCheckout(
				db.mockTx as any,
				TENANT,
				COPY_ID,
				USER_ID,
			);
			expect(res.holdId).toBe(HOLD_ID);
		});

		it("fulfills hold on checkout completion", async () => {
			const db = makeDb({ update: [] });
			const service = new HoldsService(db as unknown as DatabaseService);

			await service.fulfillHoldOnCheckout(db.mockTx as any, TENANT, HOLD_ID);
			expect(db.mockTx.update).toHaveBeenCalled();
			expect(db.mockTx.insert).toHaveBeenCalled(); // audit log
		});
	});

	describe("hasActiveHoldsForTitle (CIR-3)", () => {
		it("returns true when waiting holds exist", async () => {
			const db = makeDb({ selects: [[{ id: HOLD_ID }]] });
			const service = new HoldsService(db as unknown as DatabaseService);

			const result = await service.hasActiveHoldsForTitle(
				db.mockTx as any,
				TENANT,
				TITLE_ID,
			);
			expect(result).toBe(true);
		});

		it("returns false when no waiting holds exist", async () => {
			const db = makeDb({ selects: [[]] });
			const service = new HoldsService(db as unknown as DatabaseService);

			const result = await service.hasActiveHoldsForTitle(
				db.mockTx as any,
				TENANT,
				TITLE_ID,
			);
			expect(result).toBe(false);
		});
	});

	describe("cancelHold (HLD-3)", () => {
		it("throws NotFoundException when hold is not found", async () => {
			const db = makeDb({ selects: [[]] });
			const service = new HoldsService(db as unknown as DatabaseService);

			await expect(
				service.cancelHold(TENANT, ACTOR, "MEMBER", HOLD_ID),
			).rejects.toThrow(NotFoundException);
		});

		it("throws ForbiddenException when member cancels another user hold", async () => {
			const db = makeDb({
				selects: [[{ id: HOLD_ID, userId: OTHER_USER, status: "PENDING" }]],
			});
			const service = new HoldsService(db as unknown as DatabaseService);

			await expect(
				service.cancelHold(TENANT, ACTOR, "MEMBER", HOLD_ID),
			).rejects.toThrow(ForbiddenException);
		});

		it("allows staff to cancel any member hold", async () => {
			const db = makeDb({
				selects: [[{ id: HOLD_ID, userId: OTHER_USER, status: "PENDING" }]],
				update: [],
			});
			const service = new HoldsService(db as unknown as DatabaseService);

			const res = await service.cancelHold(TENANT, ACTOR, "LIBRARIAN", HOLD_ID);
			expect(res.success).toBe(true);
		});

		it("cascades to next hold when cancelling a READY hold with a copy", async () => {
			const db = makeDb({
				selects: [
					[
						{
							id: HOLD_ID,
							userId: ACTOR,
							status: "READY",
							copyId: COPY_ID,
							catalogueItemId: TITLE_ID,
						},
					],
					[], // no more pending holds for cascade
				],
				update: [],
			});
			const service = new HoldsService(db as unknown as DatabaseService);

			const res = await service.cancelHold(TENANT, ACTOR, "MEMBER", HOLD_ID);
			expect(res.success).toBe(true);
			expect(db.mockTx.update).toHaveBeenCalled();
		});
	});
});
