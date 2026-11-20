import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { IdentityService } from './identity.service.js';
import { IdentityLookupService } from './identity-lookup.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [IdentityService, IdentityLookupService],
  exports: [IdentityService, IdentityLookupService],
})
export class IdentityModule {}
