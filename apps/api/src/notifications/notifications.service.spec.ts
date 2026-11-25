import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../database/database.service.js';
import type { EmailDeliveryService } from './email-delivery.service.js';
import {
	NotificationsService,
	isNairobiQuietHours,
	nextNairobiMorning,
} from './notifications.service.js';
import type { SmsDeliveryService } from './sms-delivery.service.js';

describe('NotificationsService (NOT-1 & NOT-2)', () => {
	const tenantId = '00000000-0000-0000-0000-000000000001';
	const userId = '00000000-0000-0000-0000-000000000002';

	let service: NotificationsService;
	let mockDatabase: DatabaseService;
	let mockEmailDelivery: EmailDeliveryService;
	let mockSmsDelivery: SmsDeliveryService;
	let sendEmailMock: ReturnType<typeof vi.fn>;
	let sendSmsMock: ReturnType<typeof vi.fn>;

	let insertedValues: any[] = [];
	let updatedValues: any[] = [];
	let selectRows: any[] = [];

	beforeEach(() => {
		insertedValues = [];
		updatedValues = [];
		selectRows = [];

		const createQueryChain = (getRows: () => any[]) => {
			const chain: any = {
				from: vi.fn(() => chain),
				where: vi.fn(() => chain),
				limit: vi.fn(() => chain),
				offset: vi.fn(() => chain),
				orderBy: vi.fn(() => chain),
				onConflictDoNothing: vi.fn().mockImplementation(() => chain),
				values: vi.fn((val: any) => {
					insertedValues.push(val);
					return chain;
				}),
				set: vi.fn((val: any) => {
					updatedValues.push(val);
					return chain;
				}),
				returning: vi.fn(() => chain),
				// oxlint-disable-next-line unicorn/no-thenable
				then: (onfulfilled: any, onrejected: any) =>
					Promise.resolve(getRows()).then(onfulfilled, onrejected),
			};
			return chain;
		};

		const mockTx: any = {
			select: vi.fn(() => createQueryChain(() => selectRows)),
			insert: vi.fn(() => createQueryChain(() => insertedValues)),
			update: vi.fn(() => createQueryChain(() => updatedValues)),
		};

		mockDatabase = {
			withTenant: vi.fn(async (_tid: string, cb: (tx: any) => Promise<any>) =>
				cb(mockTx),
			),
		} as unknown as DatabaseService;

        sendEmailMock = vi.fn().mockResolvedValue(undefined);
        sendSmsMock = vi.fn().mockResolvedValue(undefined);
		mockEmailDelivery = {
			sendEmail: sendEmailMock,
		} as unknown as EmailDeliveryService;

		mockSmsDelivery = {
			sendSms: sendSmsMock,
		} as unknown as SmsDeliveryService;

		service = new NotificationsService(
			mockDatabase,
			mockEmailDelivery,
			mockSmsDelivery,
		);
	});

	describe('Nairobi Quiet Hours helper functions', () => {
		it('identifies 20:00 Nairobi (17:00 UTC) as quiet hours', () => {
			const date = new Date('2026-11-23T17:00:00.000Z');
			expect(isNairobiQuietHours(date)).toBe(true);
		});

		it('identifies 23:00 Nairobi (20:00 UTC) as quiet hours', () => {
			const date = new Date('2026-11-23T20:00:00.000Z');
			expect(isNairobiQuietHours(date)).toBe(true);
		});

		it('identifies 06:59 Nairobi (03:59 UTC) as quiet hours', () => {
			const date = new Date('2026-11-23T03:59:00.000Z');
			expect(isNairobiQuietHours(date)).toBe(true);
		});

		it('identifies 07:00 Nairobi (04:00 UTC) as NOT quiet hours', () => {
			const date = new Date('2026-11-23T04:00:00.000Z');
			expect(isNairobiQuietHours(date)).toBe(false);
		});

		it('identifies 14:00 Nairobi (11:00 UTC) as NOT quiet hours', () => {
			const date = new Date('2026-11-23T11:00:00.000Z');
			expect(isNairobiQuietHours(date)).toBe(false);
		});

		it('calculates next Nairobi morning (07:00 local = 04:00 UTC next day)', () => {
			const evening = new Date('2026-11-23T18:00:00.000Z'); // 21:00 Nairobi
			const nextMorning = nextNairobiMorning(evening);
			expect(nextMorning.toISOString()).toBe('2026-11-24T04:00:00.000Z');
		});
	});

	describe('queueNotification', () => {
		it('queues an EMAIL as PENDING status', async () => {
			await service.queueNotification({
				tenantId,
				userId,
				channel: 'EMAIL',
				eventType: 'HOLD_READY',
				recipient: 'patron@example.com',
				subject: 'Hold Ready',
				body: 'Your book is ready',
				dedupeKey: 'hold-ready:123',
			});

			expect(insertedValues).toHaveLength(1);
			expect(insertedValues[0]).toMatchObject({
				tenantId,
				userId,
				channel: 'EMAIL',
				eventType: 'HOLD_READY',
				status: 'PENDING',
				dedupeKey: 'hold-ready:123',
			});
		});

		it('queues an SMS during quiet hours with status QUEUED_QUIET_HOURS and scheduledFor next morning', async () => {
			// Mock date to 21:00 Nairobi (18:00 UTC)
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-11-23T18:00:00.000Z'));

			await service.queueNotification({
				tenantId,
				userId,
				channel: 'SMS',
				eventType: 'HOLD_READY',
				recipient: '+254712345678',
				subject: 'Hold Ready',
				body: 'Your book is ready',
				dedupeKey: 'hold-ready:sms:123',
			});

			expect(insertedValues).toHaveLength(1);
			expect(insertedValues[0].status).toBe('QUEUED_QUIET_HOURS');
			expect(insertedValues[0].scheduledFor.toISOString()).toBe(
				'2026-11-24T04:00:00.000Z',
			);

			vi.useRealTimers();
		});
	});

	describe('dispatchPending', () => {
		it('sends pending email notifications and updates status to SENT', async () => {
			selectRows = [
				{
					id: 'notif-1',
					tenantId,
					userId,
					channel: 'EMAIL',
					eventType: 'DUE_SOON',
					recipient: 'patron@example.com',
					subject: 'Due Soon',
					body: 'Due tomorrow',
					status: 'PENDING',
					scheduledFor: new Date(),
					attemptCount: 0,
				},
			];

			await service.dispatchPending(tenantId);

			expect(sendEmailMock).toHaveBeenCalledWith(
				'patron@example.com',
				'Due Soon',
				'Due tomorrow',
			);
			expect(updatedValues).toHaveLength(1);
			expect(updatedValues[0].status).toBe('SENT');
			expect(updatedValues[0].sentAt).toBeInstanceOf(Date);
		});

		it('handles delivery failure: increments attemptCount and sets status to FAILED when attempts >= 3', async () => {
			selectRows = [
				{
					id: 'notif-1',
					tenantId,
					userId,
					channel: 'SMS',
					eventType: 'DUE_SOON',
					recipient: '+254712345678',
					subject: 'Due Soon',
					body: 'Due tomorrow',
					status: 'PENDING',
					scheduledFor: new Date(),
					attemptCount: 2,
				},
			];

			sendSmsMock.mockRejectedValue(
				new Error('Network error'),
			);

			await service.dispatchPending(tenantId);

			expect(updatedValues).toHaveLength(1);
			expect(updatedValues[0].status).toBe('FAILED');
			expect(updatedValues[0].attemptCount).toBe(3);
			expect(updatedValues[0].errorMessage).toContain('Network error');
		});

		it('increments attemptCount and stays PENDING when attempts < 3', async () => {
			selectRows = [
				{
					id: 'notif-1',
					tenantId,
					userId,
					channel: 'SMS',
					eventType: 'DUE_SOON',
					recipient: '+254712345678',
					subject: 'Due Soon',
					body: 'Due tomorrow',
					status: 'PENDING',
					scheduledFor: new Date(),
					attemptCount: 0,
				},
			];

			sendSmsMock.mockRejectedValue(
				new Error('Network error'),
			);

			await service.dispatchPending(tenantId);

			expect(updatedValues).toHaveLength(1);
			expect(updatedValues[0].status).toBe('PENDING');
			expect(updatedValues[0].attemptCount).toBe(1);
		});
	});

	describe('notifyHoldReady', () => {
		it('fetches patron contact and queues notification with HOLD_READY', async () => {
			selectRows = [{ email: 'patron@example.com', phone: '+254712345678' }];

			await service.notifyHoldReady(
				tenantId,
				userId,
				'hold-456',
				'Clean Code',
				'2026-11-26',
			);

			expect(insertedValues.length).toBeGreaterThanOrEqual(1);
			const emailNotif = insertedValues.find((v) => v.channel === 'EMAIL');
			expect(emailNotif).toBeDefined();
			expect(emailNotif.eventType).toBe('HOLD_READY');
			expect(emailNotif.dedupeKey).toBe('hold-ready:hold-456');
			expect(emailNotif.subject).toContain('Clean Code');
			expect(emailNotif.body).toContain('Clean Code');
		});
	});

	describe('notifyFinePosted', () => {
		it('fetches patron contact and queues notification with FINE_POSTED', async () => {
			selectRows = [{ email: 'patron@example.com', phone: '+254712345678' }];

			await service.notifyFinePosted(
				tenantId,
				userId,
				'loan-789',
				'Clean Code',
				50.0,
			);

			expect(insertedValues.length).toBeGreaterThanOrEqual(1);
			const emailNotif = insertedValues.find((v) => v.channel === 'EMAIL');
			expect(emailNotif).toBeDefined();
			expect(emailNotif.eventType).toBe('FINE_POSTED');
			expect(emailNotif.dedupeKey).toBe('fine-posted:loan-789');
			expect(emailNotif.body).toContain('50.00');
		});
	});
});
