import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";

export type AccessTokenClaims = {
  sub: string;
  businessId: string;
  role: string;
};

export async function signAccessToken(app: FastifyInstance, claims: AccessTokenClaims): Promise<string> {
  return app.jwt.sign(
    {
      sub: claims.sub,
      businessId: claims.businessId,
      role: claims.role
    },
    {
      expiresIn: app.config.JWT_ACCESS_TOKEN_TTL_SECONDS
    }
  );
}

export function newRefreshToken(): string {
  return nanoid(48);
}

