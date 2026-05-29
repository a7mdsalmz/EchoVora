import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { WorkerEnv } from "../env.js";

export function createR2Client(env: WorkerEnv): S3Client | null {
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

export async function getR2ObjectBytes(args: { client: S3Client; bucket: string; key: string }): Promise<Uint8Array> {
  const res = await args.client.send(new GetObjectCommand({ Bucket: args.bucket, Key: args.key }));
  const body = res.Body;
  if (!body) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as any) chunks.push(chunk instanceof Uint8Array ? chunk : Buffer.from(chunk));
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

