import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyRequest } from "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      businessId: string;
      role: string;
    };
    user: {
      sub: string;
      businessId: string;
      role: string;
    };
  }
}

export default fp(async (app) => {
  await app.register(jwt, {
    secret: app.config.JWT_SECRET
  });

  app.decorate("authenticate", async (req: FastifyRequest) => {
    await req.jwtVerify();
  });
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest) => Promise<void>;
  }
}

