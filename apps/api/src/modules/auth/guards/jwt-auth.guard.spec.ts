import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  // ---------------------------------------------------------------------------
  // handleRequest
  // ---------------------------------------------------------------------------
  describe('handleRequest', () => {
    it('should return the user when no error and user object is present', () => {
      const user = { sub: 'user-1', email: 'test@store.com', tenant_id: 'tenant-1', roles: ['Admin'] };

      const result = guard.handleRequest(null, user, null, {} as ExecutionContext);

      expect(result).toEqual(user);
    });

    it('should throw the original error when err is provided (e.g. expired token)', () => {
      const error = new Error('TokenExpiredError: jwt expired');

      expect(() => {
        guard.handleRequest(error, null, null, {} as ExecutionContext);
      }).toThrow(error);
    });

    it('should throw UnauthorizedException with "Invalid or expired token" when user is null', () => {
      expect(() => {
        guard.handleRequest(null, null, null, {} as ExecutionContext);
      }).toThrow(new UnauthorizedException('Invalid or expired token'));
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => {
        guard.handleRequest(null, undefined, null, {} as ExecutionContext);
      }).toThrow(new UnauthorizedException('Invalid or expired token'));
    });

    it('should NOT throw when err is null and user is valid (sanity check)', () => {
      expect(() => {
        guard.handleRequest(null, { sub: 'user-1' }, null, {} as ExecutionContext);
      }).not.toThrow();
    });
  });
});
