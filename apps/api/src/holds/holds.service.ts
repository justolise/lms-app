import {
	ForbiddenException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from "@nestjs/common";
import { and, desc, eq, inArray, lte } from "drizzle-orm";

import type { DatabaseTransaction } from "../database/database.service.js";
import { DatabaseService } from "../database/database.service.js";
import {
	auditLogs,
	catalogueItems,
	copies,
	type Hold,
	holds,
	loans,
	users,
} from "../database/schema.js";
import type { CreateHoldDto } from "./dto/create-hold.dto.js";

export interface FulfillHoldResult {
	holdFulfilled: boolean;
	hold?: Hold;
	claimantUserId?: string;
	expiresAt?: Date | null;
}

@Injectable()
export class HoldsService {
	constructor(private readonly database: DatabaseService) {}

	/**
	 * HLD-1: Place a hold on a title when no copies are currently available.
	 */
	async placeHold(
		tenantId: string,
		actorId: string,
		actorRole: string,
		dto: CreateHoldDto,
	) {
		const isStaff = actorRole === "ADMIN" || actorRole === "LIBRARIAN";
		const targetUserId = isStaff && dto.userId ? dto.userId : actorId;

		return this.database.withTenant(tenantId, async (tx) => {
			// 1. Verify target user exists and is ACTIVE
			const [user] = await tx
				.select({
					id: users.id,
					status: users.status,
					fullName: users.fullName,
				})
				.from(users)
				.where(and(eq(users.tenantId, tenantId), eq(users.id, targetUserId)))
				.limit(1);

			if (!user) {
				throw new NotFoundException("Target user not found");
			}

			if (user.status !== "ACTIVE") {
				throw new UnprocessableEntityException(
					"Cannot place a hold for an inactive or suspended user account",
				);
			}

			// 2. Verify catalogue title exists
			const [title] = await tx
				.select({
					id: catalogueItems.id,
					title: catalogueItems.title,
					status: catalogueItems.status,
				})
				.from(catalogueItems)
				.where(
					and(
						eq(catalogueItems.tenantId, tenantId),
						eq(catalogueItems.id, dto.catalogueItemId),
					),
				)
				.limit(1);

			if (!title) {
				throw new NotFoundException("Catalogue title not found");
			}

			if (title.status !== "ACTIVE") {
				throw new UnprocessableEntityException(
					"Cannot place a hold on an archived catalogue title",
				);
			}

			// 3. Verify that 0 copies are available (HLD-1)
			const availableCopies = await tx
				.select({ id: copies.id })
				.from(copies)
				.where(
					and(
						eq(copies.tenantId, tenantId),
						eq(copies.catalogueItemId, dto.catalogueItemId),
						eq(copies.status, "AVAILABLE"),
					),
				);

			if (availableCopies.length > 0) {
				throw new UnprocessableEntityException(
					"Holds can only be placed when no copies are currently available (HLD-1). Please check out an available copy.",
				);
			}

			// 4. Verify patron does not currently have this title on loan (HLD-1)
			const [existingLoan] = await tx
				.select({ id: loans.id })
				.from(loans)
				.where(
					and(
						eq(loans.tenantId, tenantId),
						eq(loans.userId, targetUserId),
						eq(loans.catalogueItemId, dto.catalogueItemId),
						eq(loans.status, "ACTIVE"),
					),
				)
				.limit(1);

			if (existingLoan) {
				throw new UnprocessableEntityException(
					"You currently have a copy of this title on loan. Holds cannot be placed on titles you already possess (HLD-1).",
				);
			}

			// 5. Verify patron does not already have an active hold on this title
			const [existingHold] = await tx
				.select({ id: holds.id, status: holds.status })
				.from(holds)
				.where(
					and(
						eq(holds.tenantId, tenantId),
						eq(holds.userId, targetUserId),
						eq(holds.catalogueItemId, dto.catalogueItemId),
						inArray(holds.status, ["PENDING", "READY"]),
					),
				)
				.limit(1);

			if (existingHold) {
				throw new UnprocessableEntityException(
					"You already have an active hold for this title (HLD-1).",
				);
			}

			// 6. Insert PENDING hold
			const [newHold] = await tx
				.insert(holds)
				.values({
					tenantId,
					userId: targetUserId,
					catalogueItemId: dto.catalogueItemId,
					status: "PENDING",
					pickupWindowHours: 72,
				})
				.returning();

			// 7. Calculate queue position (FIFO order)
			const olderHolds = await tx
				.select({ id: holds.id })
				.from(holds)
				.where(
					and(
						eq(holds.tenantId, tenantId),
						eq(holds.catalogueItemId, dto.catalogueItemId),
						eq(holds.status, "PENDING"),
						lte(holds.placedAt, newHold.placedAt),
					),
				);

			const queuePosition = olderHolds.length;

			// 8. Audit log
			await tx.insert(auditLogs).values({
				tenantId,
				actorId,
				action: "HOLD_PLACED",
				entityType: "HOLD",
				entityId: newHold.id,
				metadata: {
					targetUserId,
					catalogueItemId: dto.catalogueItemId,
					queuePosition,
				},
			});

			return {
				...newHold,
				queuePosition,
				bookTitle: title.title,
			};
		});
	}

	/**
	 * HLD-2: Fulfill the next waiting hold when a copy is returned.
	 * Runs inside an existing transaction from CirculationService.returnLoan.
	 */
	async fulfillNextHoldOnReturn(
		tx: DatabaseTransaction,
		tenantId: string,
		catalogueItemId: string,
		copyId: string,
	): Promise<FulfillHoldResult> {
		// Find oldest PENDING hold
		const [nextHold] = await tx
			.select()
			.from(holds)
			.where(
				and(
					eq(holds.tenantId, tenantId),
					eq(holds.catalogueItemId, catalogueItemId),
					eq(holds.status, "PENDING"),
				),
			)
			.orderBy(holds.placedAt)
			.limit(1);

		if (!nextHold) {
			// No waiting holds: copy becomes AVAILABLE
			await tx
				.update(copies)
				.set({ status: "AVAILABLE", updatedAt: new Date() })
				.where(and(eq(copies.tenantId, tenantId), eq(copies.id, copyId)));

			return { holdFulfilled: false };
		}

		// Set hold to READY with 72-hour expiration window
		const now = new Date();
		const expiresAt = new Date(
			now.getTime() + nextHold.pickupWindowHours * 3600 * 1000,
		);

		const [readyHold] = await tx
			.update(holds)
			.set({
				status: "READY",
				copyId,
				readyAt: now,
				expiresAt,
				updatedAt: now,
			})
			.where(and(eq(holds.tenantId, tenantId), eq(holds.id, nextHold.id)))
			.returning();

		// Set copy to RESERVED
		await tx
			.update(copies)
			.set({ status: "RESERVED", updatedAt: now })
			.where(and(eq(copies.tenantId, tenantId), eq(copies.id, copyId)));

		// Audit log
		await tx.insert(auditLogs).values({
			tenantId,
			actorId: nextHold.userId,
			action: "HOLD_READY",
			entityType: "HOLD",
			entityId: readyHold.id,
			metadata: {
				copyId,
				expiresAt: expiresAt.toISOString(),
			},
		});

		return {
			holdFulfilled: true,
			hold: readyHold,
			claimantUserId: nextHold.userId,
			expiresAt,
		};
	}

	/**
	 * CIR-1 Integration: Verify claimant when checking out an ON_HOLD copy.
	 */
	async verifyClaimantForCheckout(
		tx: DatabaseTransaction,
		tenantId: string,
		copyId: string,
		userId: string,
	): Promise<{ holdId: string | null }> {
		const [readyHold] = await tx
			.select({ id: holds.id, userId: holds.userId })
			.from(holds)
			.where(
				and(
					eq(holds.tenantId, tenantId),
					eq(holds.copyId, copyId),
					eq(holds.status, "READY"),
				),
			)
			.limit(1);

		if (!readyHold) {
			return { holdId: null };
		}

		if (readyHold.userId !== userId) {
			throw new UnprocessableEntityException(
				"This copy is reserved for another member with an active hold (HLD-1).",
			);
		}

		return { holdId: readyHold.id };
	}

	/**
	 * CIR-1 Integration: Fulfill the hold once claimant completes checkout.
	 */
	async fulfillHoldOnCheckout(
		tx: DatabaseTransaction,
		tenantId: string,
		holdId: string,
	): Promise<void> {
		const now = new Date();
		await tx
			.update(holds)
			.set({
				status: "FULFILLED",
				fulfilledAt: now,
				updatedAt: now,
			})
			.where(and(eq(holds.tenantId, tenantId), eq(holds.id, holdId)));

		await tx.insert(auditLogs).values({
			tenantId,
			actorId: holdId,
			action: "HOLD_FULFILLED",
			entityType: "HOLD",
			entityId: holdId,
		});
	}

	/**
	 * CIR-3 Integration: Check if title has waiting holds to block renewals.
	 */
	async hasActiveHoldsForTitle(
		tx: DatabaseTransaction,
		tenantId: string,
		catalogueItemId: string,
	): Promise<boolean> {
		const [waitingHold] = await tx
			.select({ id: holds.id })
			.from(holds)
			.where(
				and(
					eq(holds.tenantId, tenantId),
					eq(holds.catalogueItemId, catalogueItemId),
					eq(holds.status, "PENDING"),
				),
			)
			.limit(1);

		return Boolean(waitingHold);
	}

	/**
	 * HLD-3: Cancel a hold.
	 * Member cancels own; Librarian/Admin cancels any.
	 * If cancelled hold was READY, copy cascades to next patron or becomes AVAILABLE.
	 */
	async cancelHold(
		tenantId: string,
		actorId: string,
		actorRole: string,
		holdId: string,
		reason?: string,
	) {
		const isStaff = actorRole === "ADMIN" || actorRole === "LIBRARIAN";

		return this.database.withTenant(tenantId, async (tx) => {
			const [hold] = await tx
				.select()
				.from(holds)
				.where(and(eq(holds.tenantId, tenantId), eq(holds.id, holdId)))
				.limit(1);

			if (!hold) {
				throw new NotFoundException("Hold record not found");
			}

			if (!isStaff && hold.userId !== actorId) {
				throw new ForbiddenException(
					"You do not have permission to cancel another member’s hold",
				);
			}

			if (hold.status !== "PENDING" && hold.status !== "READY") {
				throw new UnprocessableEntityException(
					`Cannot cancel a hold with status "${hold.status}"`,
				);
			}

			const now = new Date();
			await tx
				.update(holds)
				.set({
					status: "CANCELLED",
					cancelledAt: now,
					cancellationReason:
						reason || (isStaff ? "Staff cancellation" : "Member cancellation"),
					cancelledByUserId: actorId,
					updatedAt: now,
				})
				.where(and(eq(holds.tenantId, tenantId), eq(holds.id, holdId)));

			// If hold was READY and held a physical copy, cascade!
			if (hold.status === "READY" && hold.copyId) {
				await this.fulfillNextHoldOnReturn(
					tx,
					tenantId,
					hold.catalogueItemId,
					hold.copyId,
				);
			}

			await tx.insert(auditLogs).values({
				tenantId,
				actorId,
				action: "HOLD_CANCELLED",
				entityType: "HOLD",
				entityId: holdId,
				metadata: {
					previousStatus: hold.status,
					reason,
				},
			});

			return {
				success: true,
				message: "Hold cancelled successfully",
			};
		});
	}

	/**
	 * List holds for a title, user, or whole library.
	 */
	async listHolds(
		tenantId: string,
		actorId: string,
		actorRole: string,
		catalogueItemId?: string,
		userId?: string,
		status?: string,
	) {
		const isStaff = actorRole === "ADMIN" || actorRole === "LIBRARIAN";
		const targetUserId = !isStaff ? actorId : userId;

		return this.database.withTenant(tenantId, async (tx) => {
			const conditions = [eq(holds.tenantId, tenantId)];

			if (targetUserId) {
				conditions.push(eq(holds.userId, targetUserId));
			}

			if (catalogueItemId) {
				conditions.push(eq(holds.catalogueItemId, catalogueItemId));
			}

			if (status) {
				conditions.push(
					eq(
						holds.status,
						status as
							| "PENDING"
							| "READY"
							| "FULFILLED"
							| "CANCELLED"
							| "EXPIRED",
					),
				);
			}

			const rows = await tx
				.select({
					id: holds.id,
					tenantId: holds.tenantId,
					userId: holds.userId,
					catalogueItemId: holds.catalogueItemId,
					copyId: holds.copyId,
					status: holds.status,
					pickupWindowHours: holds.pickupWindowHours,
					placedAt: holds.placedAt,
					readyAt: holds.readyAt,
					expiresAt: holds.expiresAt,
					fulfilledAt: holds.fulfilledAt,
					cancelledAt: holds.cancelledAt,
					cancellationReason: holds.cancellationReason,
					bookTitle: catalogueItems.title,
					userFullName: users.fullName,
					userEmail: users.email,
					userPhone: users.phone,
				})
				.from(holds)
				.innerJoin(
					catalogueItems,
					and(
						eq(catalogueItems.tenantId, holds.tenantId),
						eq(catalogueItems.id, holds.catalogueItemId),
					),
				)
				.innerJoin(
					users,
					and(eq(users.tenantId, holds.tenantId), eq(users.id, holds.userId)),
				)
				.where(and(...conditions))
				.orderBy(desc(holds.placedAt));

			return rows;
		});
	}
}
