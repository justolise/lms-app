import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module.js";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AuthModule } from "./auth/auth.module.js";
import { CatalogueModule } from "./catalogue/catalogue.module.js";
import { CategoriesModule } from "./categories/categories.module.js";
import { CirculationModule } from "./circulation/circulation.module.js";
import { CorrelationIdMiddleware } from "./common/middleware/correlation-id.middleware.js";
import { RequestLoggingMiddleware } from "./common/middleware/request-logging.middleware.js";
import { FinesModule } from "./fines/fines.module.js";
import { HealthModule } from "./health/health.module.js";
import { HoldsModule } from "./holds/holds.module.js";
import { MemberTypesModule } from "./member-types/member-types.module.js";
import { MembersModule } from "./members/members.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { PlatformModule } from "./platform/platform.module.js";
import { PublicModule } from "./public/public.module.js";
import { RedisModule } from "./redis/redis.module.js";
import { ReportsModule } from "./reports/reports.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
	imports: [
		AuthModule,
		RedisModule,
		HealthModule,
		MembersModule,
		MemberTypesModule,
		UsersModule,
		CatalogueModule,
		CategoriesModule,
		CirculationModule,
		FinesModule,
		HoldsModule,
		NotificationsModule,
		PlatformModule,
		PublicModule,
		ReportsModule,
		AdminModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(CorrelationIdMiddleware, RequestLoggingMiddleware)
			.forRoutes("*");
	}
}
