import { IsUUID } from "class-validator";

export class HoldIdParamDto {
	@IsUUID("4", { message: "holdId must be a valid UUID" })
	holdId!: string;
}
