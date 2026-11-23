import {
	Injectable,
	Logger,
	ServiceUnavailableException,
} from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailDeliveryService {
	private readonly logger = new Logger(EmailDeliveryService.name);

	async sendEmail(to: string, subject: string, body: string): Promise<void> {
		const smtpHost = process.env.SMTP_HOST;

		if (!smtpHost) {
			if (process.env.NODE_ENV !== 'production') {
				this.logger.warn(
					`[DEV EMAIL] to=${to} subject="${subject}" body="${body}"`,
				);
				return;
			}
			throw new ServiceUnavailableException(
				'Email delivery provider is not configured',
			);
		}

		const transporter = nodemailer.createTransport({
			host: smtpHost,
			port: Number(process.env.SMTP_PORT ?? 587),
			secure: process.env.SMTP_SECURE === 'true',
			auth:
				process.env.SMTP_USER && process.env.SMTP_PASS
					? {
							user: process.env.SMTP_USER,
							pass: process.env.SMTP_PASS,
						}
					: undefined,
		});

		const from = process.env.SMTP_FROM ?? 'noreply@lms.local';

		await transporter.sendMail({ from, to, subject, text: body });

		this.logger.log(`Email sent to ${to}: ${subject}`);
	}
}
