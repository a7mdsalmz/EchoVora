import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  PUBLIC_API_BASE_URL: z.string().url().optional(),
  CONFIG_ENCRYPTION_KEY: z.string().optional(),
  JWT_SECRET: z.string().min(16),
  JWT_ISSUER: z.string().default("echovora"),
  JWT_AUDIENCE: z.string().default("echovora-web"),
  JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2592000),

  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_MODEL_ID: z.string().optional(),
  ELEVENLABS_VOICE_ID_EN: z.string().optional(),
  ELEVENLABS_VOICE_ID_AR: z.string().optional(),

  DEFAULT_TELEPHONY_PROVIDER: z.enum(["twilio", "telnyx", "plivo"]).optional(),
  TELEPHONY_TWILIO_WEBHOOK_SECRET: z.string().optional(),
  TELEPHONY_TELNYX_WEBHOOK_SECRET: z.string().optional(),
  TELEPHONY_PLIVO_WEBHOOK_SECRET: z.string().optional(),
  TELEPHONY_ANSWER_TOKEN_SECRET: z.string().min(16).optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().optional(),
  SEED_SUPERADMIN_EMAIL: z.string().email().optional(),
  SEED_SUPERADMIN_PASSWORD: z.string().min(12).optional()
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

