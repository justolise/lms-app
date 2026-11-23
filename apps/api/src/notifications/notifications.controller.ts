import {
	Controller,
	Get,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface.js';
import { NotificationQueryDto } from './dto/notification-query.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller(['notifications', 'api/notifications'])
@UseGuards(AccessTokenGuard, RolesGuard)
export class NotificationsController {
	constructor(private readonly notificationsService: NotificationsService) {}

	/**
	 * List notifications for the tenant (staff only: ADMIN, LIBRARIAN).
	 */
	@Get()
	@Roles('ADMIN', 'LIBRARIAN')
	async list(
		@Req() req: AuthenticatedRequest,
		@Query() query: NotificationQueryDto,
	) {
		return this.notificationsService.getNotifications(
			req.user.tenantId,
			query,
		);
	}

	/**
	 * Trigger loan reminder scan and dispatch pending notifications.
	 */
	@Post('scan')
	@Roles('ADMIN', 'LIBRARIAN')
	async scan(@Req() req: AuthenticatedRequest) {
		await this.notificationsService.scanLoanReminders(req.user.tenantId);
		await this.notificationsService.dispatchPending(req.user.tenantId);
		return { message: 'Scan and dispatch completed successfully' };
	}
}
