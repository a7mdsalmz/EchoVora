import { z } from "zod";

const WorkerEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  API_BASE_URL: z.string().url().optional(),
  SIMULATE_TELEPHONY: z.coerce.boolean().optional(),
  CONFIG_ENCRYPTION_KEY: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_INTENT_MODEL: z.string().optional(),

  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_MODEL_ID: z.string().optional(),

  DEFAULT_TELEPHONY_PROVIDER: z.enum(["twilio", "telnyx", "plivo"]).optional(),
  DEFAULT_OUTBOUND_FROM_NUMBER: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TELNYX_API_KEY: z.string().optional(),
  PLIVO_AUTH_ID: z.string().optional(),
  PLIVO_AUTH_TOKEN: z.string().optional(),
  TELEPHONY_ANSWER_TOKEN_SECRET: z.string().optional(),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().optional()
});

export type WorkerEnv = z.infer<typeof WorkerEnvSchema>;

export function getWorkerEnv(): WorkerEnv {
  const parsed = WorkerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid worker environment configuration:\n${issues}`);
  }
  return parsed.data;
}

