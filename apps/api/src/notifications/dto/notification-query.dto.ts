import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationQueryDto {
	@IsOptional()
	@IsString()
	@IsIn(['PENDING', 'QUEUED_QUIET_HOURS', 'SENT', 'FAILED'])
	status?: string;

	@IsOptional()
	@IsString()
	@IsIn(['EMAIL', 'SMS'])
	channel?: string;

	@IsOptional()
	@IsString()
	@IsIn(['HOLD_READY', 'DUE_SOON', 'OVERDUE', 'FINE_POSTED'])
	eventType?: string;

	@IsOptional()
	@IsUUID()
	userId?: string;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number = 20;
}
