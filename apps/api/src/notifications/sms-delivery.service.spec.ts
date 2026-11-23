import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SmsDeliveryService } from './sms-delivery.service.js';

describe('SmsDeliveryService (NOT-2)', () => {
	let service: SmsDeliveryService;
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
		service = new SmsDeliveryService();
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.restoreAllMocks();
	});

	it('should log mock SMS in development when AFRICASTALKING_API_KEY is unset', async () => {
		delete process.env.AFRICASTALKING_API_KEY;
		process.env.NODE_ENV = 'development';

		await expect(
			service.sendSms('+254712345678', 'Test SMS message'),
		).resolves.toBeUndefined();
	});

	it('should throw ServiceUnavailableException in production when AFRICASTALKING_API_KEY is unset', async () => {
		delete process.env.AFRICASTALKING_API_KEY;
		process.env.NODE_ENV = 'production';

		await expect(
			service.sendSms('+254712345678', 'Test SMS message'),
		).rejects.toThrow(ServiceUnavailableException);
	});

	it('should call Africa Talking API when AFRICASTALKING_API_KEY is set', async () => {
		process.env.AFRICASTALKING_API_KEY = 'test-key';
		process.env.AFRICASTALKING_USERNAME = 'sandbox';

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 201,
			json: async () => ({ SMSMessageData: { Recipients: [] } }),
		});
		vi.stubGlobal('fetch', mockFetch);

		await service.sendSms('+254712345678', 'Hold is ready');

		expect(mockFetch).toHaveBeenCalledWith(
			'https://api.africastalking.com/version1/messaging',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					apiKey: 'test-key',
				}),
			}),
		);
	});

	it('should throw error when Africa Talking API returns an error response', async () => {
		process.env.AFRICASTALKING_API_KEY = 'test-key';
		process.env.AFRICASTALKING_USERNAME = 'sandbox';

		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 400,
			text: async () => 'Invalid phone number',
		});
		vi.stubGlobal('fetch', mockFetch);

		await expect(
			service.sendSms('invalid', 'Test'),
		).rejects.toThrow("Africa's Talking API error 400");
	});
});
