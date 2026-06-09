import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parameter decorator that extracts the authenticated user
 * from `request.user` (set by Passport after JWT validation).
 *
 * Usage:
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtPayload) { ... }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
