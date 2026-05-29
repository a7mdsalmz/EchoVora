import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "./app.ts";

void test("GET /api/health", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/echovora";
  process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-test-secret";
  process.env.JWT_ISSUER = "echovora";
  process.env.JWT_AUDIENCE = "echovora-web";

  const app = await buildApp();
  const res = await app.inject({ method: "GET", url: "/api/health" });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.ok, true);
  await app.close();
});

