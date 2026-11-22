import { IsOptional, IsUUID } from "class-validator";

export class CreateHoldDto {
	@IsUUID("4", { message: "catalogueItemId must be a valid UUID" })
	catalogueItemId!: string;

	/**
	 * Optional target user ID (staff placing hold on behalf of a member).
	 * If omitted, the authenticated user's ID is used.
	 */
	@IsOptional()
	@IsUUID("4", { message: "userId must be a valid UUID" })
	userId?: string;
}
