import fp from "fastify-plugin";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";

export default fp(async (app) => {
  await app.register(sensible);
  await app.register(cors, {
    origin: true,
    credentials: true
  });
});

