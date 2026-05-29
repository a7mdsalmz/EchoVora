import { Queue } from "bullmq";

export const TELEPHONY_TEST_CALLS_QUEUE_NAME = "telephony-test-calls";

export function createTelephonyTestCallsQueue(redis: any): Queue {
  return new Queue(TELEPHONY_TEST_CALLS_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 200,
      removeOnFail: 200,
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 1000
      }
    }
  });
}

