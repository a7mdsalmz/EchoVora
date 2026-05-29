import crypto from "node:crypto";

function b64urlDecode(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function getKey(keyB64: string) {
  const key = Buffer.from(keyB64, "base64");
  if (key.byteLength !== 32) throw new Error("CONFIG_ENCRYPTION_KEY must be base64 for 32 bytes");
  return key;
}

export function decryptSecret(value: string, keyB64: string) {
  if (!value.startsWith("enc:v1:")) return value;
  const key = getKey(keyB64);
  const parts = value.split(":");
  const iv = b64urlDecode(parts[2] ?? "");
  const tag = b64urlDecode(parts[3] ?? "");
  const ciphertext = b64urlDecode(parts[4] ?? "");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

export function maybeDecryptSecret(value: unknown, keyB64: string | undefined) {
  if (typeof value !== "string") return value;
  if (!value.startsWith("enc:v1:")) return value;
  if (!keyB64) throw new Error("CONFIG_ENCRYPTION_KEY missing");
  return decryptSecret(value, keyB64);
}

