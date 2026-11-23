import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedPlatformRequest } from '../guards/platform-auth.guard.js';

export const CurrentPlatformUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedPlatformRequest>();
    return request.platformUser;
  },
);
