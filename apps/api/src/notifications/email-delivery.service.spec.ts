import { ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailDeliveryService } from './email-delivery.service.js';

vi.mock('nodemailer');

describe('EmailDeliveryService (NOT-1)', () => {
	let service: EmailDeliveryService;
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
		service = new EmailDeliveryService();
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.clearAllMocks();
	});

	it('should log mock email in development when SMTP_HOST is unset', async () => {
		delete process.env.SMTP_HOST;
		process.env.NODE_ENV = 'development';

		await expect(
			service.sendEmail('test@example.com', 'Subject', 'Body content'),
		).resolves.toBeUndefined();
	});

	it('should throw ServiceUnavailableException in production when SMTP_HOST is unset', async () => {
		delete process.env.SMTP_HOST;
		process.env.NODE_ENV = 'production';

		await expect(
			service.sendEmail('test@example.com', 'Subject', 'Body content'),
		).rejects.toThrow(ServiceUnavailableException);
	});

	it('should send email using nodemailer when SMTP_HOST is configured', async () => {
		process.env.SMTP_HOST = 'smtp.example.com';
		process.env.SMTP_PORT = '587';
		process.env.SMTP_USER = 'user';
		process.env.SMTP_PASS = 'pass';
		process.env.SMTP_FROM = 'noreply@example.com';

		const sendMailMock = vi.fn().mockResolvedValue({ messageId: '123' });
		vi.mocked(nodemailer.createTransport).mockReturnValue({
			sendMail: sendMailMock,
		} as any);

		await service.sendEmail('patron@example.com', 'Hold Ready', 'Your book is ready');

		expect(nodemailer.createTransport).toHaveBeenCalledWith(
			expect.objectContaining({
				host: 'smtp.example.com',
				port: 587,
				auth: { user: 'user', pass: 'pass' },
			}),
		);
		expect(sendMailMock).toHaveBeenCalledWith({
			from: 'noreply@example.com',
			to: 'patron@example.com',
			subject: 'Hold Ready',
			text: 'Your book is ready',
		});
	});
});
