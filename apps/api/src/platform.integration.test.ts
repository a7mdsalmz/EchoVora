import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { buildApp } from "./app.ts";

void test(
  "platform integration: register -> me -> create agent -> create order -> analytics",
  { skip: process.env.RUN_INTEGRATION_TESTS !== "1" },
  async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/echovora";
    process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-test-secret";
    process.env.JWT_ISSUER = "echovora";
    process.env.JWT_AUDIENCE = "echovora-web";

    const app = await buildApp();

    const email = `test-${randomUUID()}@example.com`;
    const password = "test-password-123";

    const reg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email, password, tenantName: `Test Biz ${randomUUID().slice(0, 8)}`, locale: "en" }
    });
    assert.equal(reg.statusCode, 200);
    const regBody = reg.json() as { accessToken: string; refreshToken: string; businessId: string };
    assert.ok(regBody.accessToken);
    assert.ok(regBody.refreshToken);
    assert.ok(regBody.businessId);

    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${regBody.accessToken}` }
    });
    assert.equal(me.statusCode, 200);

    const agentRes = await app.inject({
      method: "POST",
      url: "/api/agents",
      headers: { authorization: `Bearer ${regBody.accessToken}`, "content-type": "application/json" },
      payload: {
        type: "ORDER_CONFIRMATION",
        nameEn: "Order Confirmation",
        nameAr: "تأكيد الطلبات",
        defaultLocale: "en",
        config: { dialect: "ar-EG" }
      }
    });
    assert.equal(agentRes.statusCode, 200);

    const orderRes = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: { authorization: `Bearer ${regBody.accessToken}`, "content-type": "application/json" },
      payload: {
        customer: { phone: "+201000000000", name: "Test Customer", email: "customer@example.com" },
        externalId: `ext-${randomUUID().slice(0, 8)}`,
        amount: 99,
        currency: "USD",
        notes: "integration-test"
      }
    });
    assert.equal(orderRes.statusCode, 200);

    const analytics = await app.inject({
      method: "GET",
      url: "/api/orders/analytics",
      headers: { authorization: `Bearer ${regBody.accessToken}` }
    });
    assert.equal(analytics.statusCode, 200);
    const a = analytics.json() as { totalOrders: number };
    assert.ok(a.totalOrders >= 1);

    await app.close();
  }
);

