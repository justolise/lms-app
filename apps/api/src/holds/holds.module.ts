import { Module } from "@nestjs/common";
import { SessionModule } from "../auth/session/session.module.js";
import { TokenModule } from "../auth/token/token.module.js";
import { AccessTokenGuard } from "../common/guards/access-token.guard.js";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { DatabaseModule } from "../database/database.module.js";
import { RedisModule } from "../redis/redis.module.js";
import { HoldsController } from "./holds.controller.js";
import { HoldsService } from "./holds.service.js";

@Module({
	imports: [DatabaseModule, RedisModule, TokenModule, SessionModule],
	controllers: [HoldsController],
	providers: [HoldsService, AccessTokenGuard, RolesGuard],
	exports: [HoldsService],
})
export class HoldsModule {}
