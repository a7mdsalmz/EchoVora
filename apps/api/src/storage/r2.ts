import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Env } from "../env.js";

export function createR2Client(env: Env): S3Client | null {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) return null;
  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY
    }
  });
}

export async function putR2Object(args: {
  client: S3Client;
  bucket: string;
  key: string;
  body: Uint8Array;
  contentType: string;
}): Promise<void> {
  await args.client.send(
    new PutObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType
    })
  );
}

