import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { IdentityModule } from '../auth/identity/identity.module.js';
import { PlatformMfaService } from './auth/platform-mfa.service.js';
import { PlatformTokenService } from './auth/platform-token.service.js';
import { PlatformSessionService } from './auth/platform-session.service.js';
import { PlatformAuthService } from './auth/platform-auth.service.js';
import { PlatformAuthController } from './auth/platform-auth.controller.js';
import { PlatformBootstrapService } from './bootstrap/bootstrap.service.js';
import { PlatformAuthGuard } from './guards/platform-auth.guard.js';
import { PlatformTenantsService } from './tenants/platform-tenants.service.js';
import { PlatformTenantsController } from './tenants/platform-tenants.controller.js';
import { PlatformTenantAdminsService } from './tenant-admins/platform-tenant-admins.service.js';
import { PlatformTenantAdminsController } from './tenant-admins/platform-tenant-admins.controller.js';
import { PlatformMonitoringService } from './monitoring/platform-monitoring.service.js';
import { PlatformMonitoringController } from './monitoring/platform-monitoring.controller.js';
import { PlatformAuditLogsService } from './audit-logs/platform-audit-logs.service.js';
import { PlatformAuditLogsController } from './audit-logs/platform-audit-logs.controller.js';

@Module({
  imports: [DatabaseModule, RedisModule, IdentityModule],
  controllers: [
    PlatformAuthController,
    PlatformTenantsController,
    PlatformTenantAdminsController,
    PlatformMonitoringController,
    PlatformAuditLogsController,
  ],
  providers: [
    PlatformMfaService,
    PlatformTokenService,
    PlatformSessionService,
    PlatformAuthService,
    PlatformBootstrapService,
    PlatformAuthGuard,
    PlatformTenantsService,
    PlatformTenantAdminsService,
    PlatformMonitoringService,
    PlatformAuditLogsService,
  ],
  exports: [
    PlatformMfaService,
    PlatformTokenService,
    PlatformSessionService,
    PlatformAuthService,
    PlatformBootstrapService,
    PlatformAuthGuard,
    PlatformTenantsService,
    PlatformTenantAdminsService,
    PlatformMonitoringService,
    PlatformAuditLogsService,
  ],
})
export class PlatformModule {}
