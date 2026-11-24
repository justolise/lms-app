import { Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, or, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';
import {
	catalogueItems,
	loans,
	notifications,
	users,
} from '../database/schema.js';
import type { NotificationQueryDto } from './dto/notification-query.dto.js';
import { EmailDeliveryService } from './email-delivery.service.js';
import { SmsDeliveryService } from './sms-delivery.service.js';

// Africa/Nairobi is UTC+3 (no DST)
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Returns hour (0-23) in Nairobi wall-clock for a given UTC Date. */
function nairobiHour(utc: Date): number {
	return new Date(utc.getTime() + NAIROBI_OFFSET_MS).getUTCHours();
}

/** Is it quiet hours? 20:00 ≤ hour < 7:00 Nairobi time. */
export function isNairobiQuietHours(now: Date): boolean {
	const h = nairobiHour(now);
	return h >= 20 || h < 7;
}

/**
 * Returns a Date at 07:00 Nairobi the following morning (in UTC).
 * If it is currently quiet hours the caller may schedule delivery for this time.
 */
export function nextNairobiMorning(now: Date): Date {
	// Shift to Nairobi wall-clock, advance to next calendar day, pin to 07:00
	const local = new Date(now.getTime() + NAIROBI_OFFSET_MS);
	const nextMorningUtc = Date.UTC(
		local.getUTCFullYear(),
		local.getUTCMonth(),
		local.getUTCDate() + 1,
		7,
		0,
		0,
		0,
	);
	// Subtract the offset to convert 07:00 Nairobi → UTC
	return new Date(nextMorningUtc - NAIROBI_OFFSET_MS);
}

interface QueueParams {
	tenantId: string;
	userId: string;
	channel: 'EMAIL' | 'SMS';
	eventType: 'HOLD_READY' | 'DUE_SOON' | 'OVERDUE' | 'FINE_POSTED';
	recipient: string;
	subject: string;
	body: string;
	dedupeKey: string;
	/** If not provided, now is used. For SMS during quiet hours this is set automatically. */
	scheduledFor?: Date;
}

const MAX_ATTEMPTS = 3;

@Injectable()
export class NotificationsService {
	private readonly logger = new Logger(NotificationsService.name);

	constructor(
		private readonly database: DatabaseService,
		private readonly emailDelivery: EmailDeliveryService,
		private readonly smsDelivery: SmsDeliveryService,
	) {}

	/**
	 * Insert a notification record (idempotent via ON CONFLICT DO NOTHING on the
	 * unique (tenant_id, dedupe_key) index).
	 * For SMS channels during quiet hours the status is set to QUEUED_QUIET_HOURS
	 * and scheduledFor is pinned to the next 07:00 Nairobi.
	 */
	async queueNotification(params: QueueParams): Promise<void> {
		const now = new Date();
		let status: 'PENDING' | 'QUEUED_QUIET_HOURS' = 'PENDING';
		let scheduledFor = params.scheduledFor ?? now;

		if (params.channel === 'SMS' && isNairobiQuietHours(now)) {
			status = 'QUEUED_QUIET_HOURS';
			scheduledFor = nextNairobiMorning(now);
		}

		await this.database.withTenant(params.tenantId, async (tx) => {
			await tx
				.insert(notifications)
				.values({
					tenantId: params.tenantId,
					userId: params.userId,
					channel: params.channel,
					eventType: params.eventType,
					recipient: params.recipient,
					subject: params.subject,
					body: params.body,
					dedupeKey: params.dedupeKey,
					status,
					scheduledFor,
				})
				.onConflictDoNothing();
		});
	}

	/**
	 * Attempt delivery of all PENDING / QUEUED_QUIET_HOURS notifications whose
	 * scheduledFor is now due, for the given tenant.
	 */
	async dispatchPending(tenantId: string): Promise<void> {
		const now = new Date();

		const pending = await this.database.withTenant(tenantId, async (tx) => {
			return tx
				.select()
				.from(notifications)
				.where(
					and(
						eq(notifications.tenantId, tenantId),
						inArray(notifications.status, ['PENDING', 'QUEUED_QUIET_HOURS']),
						lte(notifications.scheduledFor, now),
					),
				)
				.limit(100);
		});

		for (const notification of pending) {
			// Skip SMS that are still in quiet-hours window (double-check)
			if (
				notification.channel === 'SMS' &&
				isNairobiQuietHours(now) &&
				notification.status === 'QUEUED_QUIET_HOURS'
			) {
				continue;
			}

			try {
				if (notification.channel === 'EMAIL') {
					await this.emailDelivery.sendEmail(
						notification.recipient,
						notification.subject ?? '',
						notification.body,
					);
				} else {
					await this.smsDelivery.sendSms(notification.recipient, notification.body);
				}

				await this.database.withTenant(tenantId, async (tx) => {
					await tx
						.update(notifications)
						.set({ status: 'SENT', sentAt: now, updatedAt: now })
						.where(
							and(
								eq(notifications.tenantId, tenantId),
								eq(notifications.id, notification.id),
							),
						);
				});
			} catch (err) {
				const attempts = (notification.attemptCount ?? 0) + 1;
				const failed = attempts >= MAX_ATTEMPTS;

				this.logger.warn(
					`Notification ${notification.id} delivery failed (attempt ${attempts}): ${String(err)}`,
				);

				await this.database.withTenant(tenantId, async (tx) => {
					await tx
						.update(notifications)
						.set({
							status: failed ? 'FAILED' : 'PENDING',
							attemptCount: attempts,
							errorMessage: String(err).slice(0, 1000),
							updatedAt: now,
						})
						.where(
							and(
								eq(notifications.tenantId, tenantId),
								eq(notifications.id, notification.id),
							),
						);
				});
			}
		}
	}

	/**
	 * Scan active loans and queue DUE_SOON (2 days before due) and OVERDUE
	 * (day 1 and every 7 days) reminders.
	 */
	async scanLoanReminders(tenantId: string): Promise<void> {
		const now = new Date();

		// Due-soon: loans whose dueAt is between 1 and 3 days from now
		const dueSoonCutoffLow = new Date(now.getTime() + 1 * 86_400_000);
		const dueSoonCutoffHigh = new Date(now.getTime() + 3 * 86_400_000);

		// Overdue: loans whose dueAt < now (status still ACTIVE)
		// Optimize query: JOIN users and catalogue_items in a single query to eliminate N+1 round trips (Concept 27)
		const loans_ = await this.database.withTenant(tenantId, async (tx) => {
			return tx
				.select({
					loanId: loans.id,
					userId: loans.userId,
					dueAt: loans.dueAt,
					catalogueItemId: loans.catalogueItemId,
					userEmail: users.email,
					userPhone: users.phone,
					bookTitle: catalogueItems.title,
				})
				.from(loans)
				.innerJoin(users, eq(loans.userId, users.id))
				.innerJoin(catalogueItems, eq(loans.catalogueItemId, catalogueItems.id))
				.where(
					and(
						eq(loans.tenantId, tenantId),
						eq(loans.status, 'ACTIVE'),
						or(
							// Due-soon window
							and(
								gte(loans.dueAt, dueSoonCutoffLow),
								lte(loans.dueAt, dueSoonCutoffHigh),
							),
							// Overdue
							lte(loans.dueAt, now),
						),
					),
				);
		});

		const libraryName =
			process.env.LIBRARY_NAME ?? 'the library';

		for (const loan of loans_) {
			const userData = { email: loan.userEmail, phone: loan.userPhone };
			const item = { title: loan.bookTitle };

			if (!userData || !item) continue;

			const dueDate = loan.dueAt.toISOString().slice(0, 10);
			const msUntilDue = loan.dueAt.getTime() - now.getTime();
			const isOverdue = msUntilDue < 0;

			if (!isOverdue) {
				// DUE_SOON
				const subject = `Your borrowed copy is due soon — ${item.title}`;
				const body = `Your borrowed copy of '${item.title}' is due on ${dueDate} at ${libraryName}. Please return it on time.`;

				if (userData.email) {
					await this.queueNotification({
						tenantId,
						userId: loan.userId,
						channel: 'EMAIL',
						eventType: 'DUE_SOON',
						recipient: userData.email,
						subject,
						body,
						dedupeKey: `due-soon:${loan.loanId}:${dueDate}`,
					});
				}
				if (userData.phone) {
					await this.queueNotification({
						tenantId,
						userId: loan.userId,
						channel: 'SMS',
						eventType: 'DUE_SOON',
						recipient: userData.phone,
						subject,
						body,
						dedupeKey: `due-soon:sms:${loan.loanId}:${dueDate}`,
					});
				}
			} else {
				// OVERDUE — only on day 1, 8, 15, 22, ...
				const overdueDays = Math.floor(-msUntilDue / 86_400_000);
				const isRemindDay =
					overdueDays === 1 || (overdueDays > 1 && (overdueDays - 1) % 7 === 0);

				if (!isRemindDay) continue;

				const subject = `Overdue reminder — ${item.title}`;
				const body = `'${item.title}' borrowed from ${libraryName} was due on ${dueDate}. Please return it as soon as possible.`;

				const dayKey = `overdue:${loan.loanId}:day${overdueDays}`;

				if (userData.email) {
					await this.queueNotification({
						tenantId,
						userId: loan.userId,
						channel: 'EMAIL',
						eventType: 'OVERDUE',
						recipient: userData.email,
						subject,
						body,
						dedupeKey: dayKey,
					});
				}
				if (userData.phone) {
					await this.queueNotification({
						tenantId,
						userId: loan.userId,
						channel: 'SMS',
						eventType: 'OVERDUE',
						recipient: userData.phone,
						subject,
						body,
						dedupeKey: `${dayKey}:sms`,
					});
				}
			}
		}
	}

	/** Queue a HOLD_READY notification for the patron whose hold is now ready. */
	async notifyHoldReady(
		tenantId: string,
		userId: string,
		holdId: string,
		bookTitle: string,
		pickupDeadline: string,
	): Promise<void> {
		const libraryName = process.env.LIBRARY_NAME ?? 'the library';

		const [userData] = await this.database.withTenant(tenantId, async (tx) => {
			return tx
				.select({ email: users.email, phone: users.phone })
				.from(users)
				.where(and(eq(users.tenantId, tenantId), eq(users.id, userId)));
		});

		if (!userData) return;

		const subject = `Your hold is ready for pickup — ${bookTitle}`;
		const body = `Your reserved copy of '${bookTitle}' is available for collection at ${libraryName} until ${pickupDeadline}.`;

		if (userData.email) {
			await this.queueNotification({
				tenantId,
				userId,
				channel: 'EMAIL',
				eventType: 'HOLD_READY',
				recipient: userData.email,
				subject,
				body,
				dedupeKey: `hold-ready:${holdId}`,
			});
		}
		if (userData.phone) {
			await this.queueNotification({
				tenantId,
				userId,
				channel: 'SMS',
				eventType: 'HOLD_READY',
				recipient: userData.phone,
				subject,
				body,
				dedupeKey: `hold-ready:sms:${holdId}`,
			});
		}
	}

	/** Queue a FINE_POSTED notification after a fine is charged on return. */
	async notifyFinePosted(
		tenantId: string,
		userId: string,
		loanId: string,
		bookTitle: string,
		amountKes: number,
	): Promise<void> {
		const libraryName = process.env.LIBRARY_NAME ?? 'the library';

		const [userData] = await this.database.withTenant(tenantId, async (tx) => {
			return tx
				.select({ email: users.email, phone: users.phone })
				.from(users)
				.where(and(eq(users.tenantId, tenantId), eq(users.id, userId)));
		});

		if (!userData) return;

		const amount = amountKes.toFixed(2);
		const subject = `Fine posted — ${bookTitle}`;
		const body = `A fine of KES ${amount} has been recorded for the late return of '${bookTitle}' at ${libraryName}.`;

		if (userData.email) {
			await this.queueNotification({
				tenantId,
				userId,
				channel: 'EMAIL',
				eventType: 'FINE_POSTED',
				recipient: userData.email,
				subject,
				body,
				dedupeKey: `fine-posted:${loanId}`,
			});
		}
		if (userData.phone) {
			await this.queueNotification({
				tenantId,
				userId,
				channel: 'SMS',
				eventType: 'FINE_POSTED',
				recipient: userData.phone,
				subject,
				body,
				dedupeKey: `fine-posted:sms:${loanId}`,
			});
		}
	}

	/** Get paginated notifications for the tenant. */
	async getNotifications(tenantId: string, query: NotificationQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const offset = (page - 1) * limit;

		return this.database.withTenant(tenantId, async (tx) => {
			const conditions = [eq(notifications.tenantId, tenantId)];
			if (query.status) {
				conditions.push(
					eq(notifications.status, query.status as typeof notifications.$inferSelect['status']),
				);
			}
			if (query.channel) {
				conditions.push(
					eq(notifications.channel, query.channel as typeof notifications.$inferSelect['channel']),
				);
			}
			if (query.eventType) {
				conditions.push(
					eq(notifications.eventType, query.eventType as typeof notifications.$inferSelect['eventType']),
				);
			}
			if (query.userId) {
				conditions.push(eq(notifications.userId, query.userId));
			}

			const [items, totalResult] = await Promise.all([
				tx
					.select()
					.from(notifications)
					.where(and(...conditions))
					.orderBy(desc(notifications.createdAt))
					.limit(limit)
					.offset(offset),
				tx
					.select({ count: sql<number>`count(*)` })
					.from(notifications)
					.where(and(...conditions)),
			]);

			return {
				items,
				total: Number(totalResult[0]?.count ?? 0),
				page,
				limit,
			};
		});
	}
}
