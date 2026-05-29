import fp from "fastify-plugin";
import { getEnv } from "../env.js";

declare module "fastify" {
  interface FastifyInstance {
    config: ReturnType<typeof getEnv>;
  }
}

export default fp(async (app) => {
  app.decorate("config", getEnv());
});

