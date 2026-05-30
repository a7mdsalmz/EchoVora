import Fastify from "fastify";
import configPlugin from "./plugins/config.js";
import httpPlugin from "./plugins/http.js";
import jwtPlugin from "./plugins/jwt.js";
import authorizePlugin from "./plugins/authorize.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { tenantRoutes } from "./routes/tenants.js";
import { telephonyRoutes } from "./routes/telephony.js";
import { telephonyAnswerRoutes } from "./routes/telephonyAnswer.js";
import { telephonyTtsRoutes } from "./routes/telephonyTts.js";
import { telephonyDtmfRoutes } from "./routes/telephonyDtmf.js";
import { telephonySettingsRoutes } from "./routes/telephonySettings.js";
import { callCenterRoutes } from "./routes/callCenter.js";
import { billingRoutes } from "./routes/billing.js";
import { moduleRoutes } from "./routes/modules.js";
import { workflowRoutes } from "./routes/workflows.js";
import { callRoutes } from "./routes/calls.js";
import { orderRoutes } from "./routes/orders.js";
import { agentRoutes } from "./routes/agents.js";
import { adminIntegrationsRoutes } from "./routes/adminIntegrations.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "warn"
    }
  });

  await app.register(configPlugin);
  await app.register(httpPlugin);
  await app.register(jwtPlugin);
  await app.register(authorizePlugin);

  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(tenantRoutes, { prefix: "/api" });
  await app.register(telephonyRoutes, { prefix: "/api" });
  await app.register(telephonyAnswerRoutes, { prefix: "/api" });
  await app.register(telephonyTtsRoutes, { prefix: "/api" });
  await app.register(telephonyDtmfRoutes, { prefix: "/api" });
  await app.register(telephonySettingsRoutes, { prefix: "/api" });
  await app.register(callCenterRoutes, { prefix: "/api" });
  await app.register(billingRoutes, { prefix: "/api" });
  await app.register(moduleRoutes, { prefix: "/api" });
  await app.register(workflowRoutes, { prefix: "/api" });
  await app.register(callRoutes, { prefix: "/api" });
  await app.register(orderRoutes, { prefix: "/api" });
  await app.register(agentRoutes, { prefix: "/api" });
  await app.register(adminIntegrationsRoutes, { prefix: "/api" });

  return app;
}

