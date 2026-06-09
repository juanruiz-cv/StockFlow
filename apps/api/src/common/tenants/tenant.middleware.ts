import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as passport from 'passport';
import { TenantContextService } from './tenant-context.service';

/**
 * Middleware that extracts tenant_id from the JWT (via passport) and
 * sets it in the AsyncLocalStorage tenant context.
 *
 * For unauthenticated routes (e.g., /auth/login), the middleware
 * still allows the request through but without a tenant context.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No JWT — pass through without tenant context
      next();
      return;
    }

    // Use passport to authenticate and extract the JWT payload
    passport.authenticate('jwt', { session: false }, (err: any, user: any) => {
      if (err) {
        next(err);
        return;
      }

      if (!user) {
        next(new UnauthorizedException('Invalid or expired token'));
        return;
      }

      if (!user.tenant_id) {
        next(new UnauthorizedException('Token missing tenant_id claim'));
        return;
      }

      // Run the rest of the request within the tenant context
      this.tenantContext.run(
        {
          tenantId: user.tenant_id,
          userId: user.sub,
          email: user.email,
          roles: user.roles ?? [],
        },
        () => {
          next();
        },
      );
    })(req, res, next);
  }
}
