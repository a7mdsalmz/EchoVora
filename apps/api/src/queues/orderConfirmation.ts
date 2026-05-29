import { Queue } from "bullmq";

export const ORDER_CONFIRMATION_QUEUE_NAME = "order-confirmation";

export function createOrderConfirmationQueue(redis: any): Queue {
  return new Queue(ORDER_CONFIRMATION_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 2000,
      removeOnFail: 2000,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000
      }
    }
  });
}

