import { Queue } from "bullmq";

export const TELEPHONY_QUEUE_NAME = "telephony-events";

export function createTelephonyQueue(redis: any): Queue {
  return new Queue(TELEPHONY_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 200,
      removeOnFail: 200,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000
      }
    }
  });
}

