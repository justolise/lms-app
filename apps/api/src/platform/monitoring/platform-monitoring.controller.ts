import { Controller, Get, UseGuards } from '@nestjs/common';
import { PlatformAuthGuard } from '../guards/platform-auth.guard.js';
import {
  PlatformMonitoringService,
  PlatformMonitoringStats,
} from './platform-monitoring.service.js';

@Controller('api/platform/monitoring')
@UseGuards(PlatformAuthGuard)
export class PlatformMonitoringController {
  constructor(private readonly monitoringService: PlatformMonitoringService) {}

  @Get('stats')
  async getStats(): Promise<PlatformMonitoringStats> {
    return this.monitoringService.getPlatformStats();
  }
}
