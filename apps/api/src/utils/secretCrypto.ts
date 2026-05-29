import crypto from "node:crypto";

function b64urlEncode(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function getKey(keyB64: string) {
  const key = Buffer.from(keyB64, "base64");
  if (key.byteLength !== 32) throw new Error("CONFIG_ENCRYPTION_KEY must be base64 for 32 bytes");
  return key;
}

export function encryptSecret(plain: string, keyB64: string) {
  if (!plain.length) return plain;
  if (plain.startsWith("enc:v1:")) return plain;
  const key = getKey(keyB64);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plain, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${b64urlEncode(iv)}:${b64urlEncode(tag)}:${b64urlEncode(ciphertext)}`;
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

