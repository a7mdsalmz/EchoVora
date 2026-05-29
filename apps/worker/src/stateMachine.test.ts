import test from "node:test";
import assert from "node:assert/strict";
import { reduceCallStatus } from "./orchestration/stateMachine.ts";
import { CallStatus } from "@prisma/client";

void test("reduceConversation transitions", () => {
  const a = reduceCallStatus(CallStatus.NEW, "call.started");
  assert.equal(a, CallStatus.IN_PROGRESS);
  const b = reduceCallStatus(a, "call.completed");
  assert.equal(b, CallStatus.COMPLETED);
});

