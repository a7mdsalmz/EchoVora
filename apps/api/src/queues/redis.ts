import IORedis from "ioredis";

export function createRedis(url: string) {
  const RedisCtor = IORedis as any;
  return new RedisCtor(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true
  });
}

