import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that validates Bearer JWT tokens on protected routes.
 *
 * Can be applied globally, per-controller, or per-route:
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * ```
 *
 * On validation failure, returns HTTP 401 with a descriptive message.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: Error | null, user: any, _info: any, _context: ExecutionContext): any {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
