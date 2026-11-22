import { IsOptional, IsString, MaxLength } from "class-validator";

export class CancelHoldDto {
	@IsOptional()
	@IsString()
	@MaxLength(255)
	reason?: string;
}
