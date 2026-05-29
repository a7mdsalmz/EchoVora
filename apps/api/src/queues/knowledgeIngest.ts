import { Queue } from "bullmq";

export const KNOWLEDGE_INGEST_QUEUE_NAME = "knowledge-ingest";

export function createKnowledgeIngestQueue(redis: any): Queue {
  return new Queue(KNOWLEDGE_INGEST_QUEUE_NAME, {
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

