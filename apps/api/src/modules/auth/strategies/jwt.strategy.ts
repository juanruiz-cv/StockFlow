import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

/**
 * Passport JWT strategy that validates Bearer tokens.
 *
 * Extracts the token from the Authorization header, verifies
 * the signature using the configured JWT_SECRET, and returns
 * the decoded payload as the authenticated user object.
 *
 * The returned payload is attached to `request.user` by Passport.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Called after Passport verifies the JWT signature.
   * Returns the payload as the user object on the request.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return {
      sub: payload.sub,
      email: payload.email,
      tenant_id: payload.tenant_id,
      roles: payload.roles ?? [],
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
