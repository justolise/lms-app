import { Module } from '@nestjs/common';
import { SessionModule } from '../auth/session/session.module.js';
import { TokenModule } from '../auth/token/token.module.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { EmailDeliveryService } from './email-delivery.service.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsSchedulerService } from './notifications-scheduler.service.js';
import { NotificationsService } from './notifications.service.js';
import { SmsDeliveryService } from './sms-delivery.service.js';

@Module({
	imports: [DatabaseModule, TokenModule, SessionModule],
	controllers: [NotificationsController],
	providers: [
		NotificationsService,
		NotificationsSchedulerService,
		EmailDeliveryService,
		SmsDeliveryService,
		AccessTokenGuard,
		RolesGuard,
	],
	exports: [NotificationsService, NotificationsSchedulerService, EmailDeliveryService, SmsDeliveryService],
})
export class NotificationsModule {}
