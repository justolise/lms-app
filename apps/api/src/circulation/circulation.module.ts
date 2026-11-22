import { Module } from "@nestjs/common";
import { SessionModule } from "../auth/session/session.module.js";
import { TokenModule } from "../auth/token/token.module.js";
import { AccessTokenGuard } from "../common/guards/access-token.guard.js";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { DatabaseModule } from "../database/database.module.js";
import { HoldsModule } from "../holds/holds.module.js";
import { RedisModule } from "../redis/redis.module.js";
import { CirculationController } from "./circulation.controller.js";
import { CirculationService } from "./circulation.service.js";

@Module({
	imports: [
		DatabaseModule,
		RedisModule,
		TokenModule,
		SessionModule,
		HoldsModule,
	],
	controllers: [CirculationController],
	providers: [CirculationService, AccessTokenGuard, RolesGuard],
	exports: [CirculationService],
})
export class CirculationModule {}
