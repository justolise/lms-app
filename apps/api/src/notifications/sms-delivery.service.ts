import {
	Injectable,
	Logger,
	ServiceUnavailableException,
} from '@nestjs/common';

@Injectable()
export class SmsDeliveryService {
	private readonly logger = new Logger(SmsDeliveryService.name);

	async sendSms(to: string, message: string): Promise<void> {
		const apiKey = process.env.AFRICASTALKING_API_KEY;

		if (!apiKey) {
			if (process.env.NODE_ENV !== 'production') {
				this.logger.warn(`[DEV SMS] to=${to} message="${message}"`);
				return;
			}
			throw new ServiceUnavailableException(
				'SMS delivery provider is not configured',
			);
		}

		const username = process.env.AFRICASTALKING_USERNAME ?? 'sandbox';
		const senderId = process.env.AFRICASTALKING_SENDER_ID ?? '';

		const params = new URLSearchParams({
			username,
			to,
			message,
			...(senderId ? { from: senderId } : {}),
		});

		const response = await fetch(
			'https://api.africastalking.com/version1/messaging',
			{
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded',
					apiKey,
				},
				body: params.toString(),
			},
		);

		if (!response.ok) {
			const text = await response.text();
			throw new Error(
				`Africa's Talking API error ${response.status}: ${text}`,
			);
		}

		this.logger.log(`SMS sent to ${to}`);
	}
}
