import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller(['health', 'api/health'])
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  getLiveness() {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async getReadiness() {
    return this.healthService.checkReadiness();
  }
}
