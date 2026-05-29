import type { PrismaClient } from "@prisma/client";
import { KnowledgeSourceStatus, KnowledgeSourceType } from "@prisma/client";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { parse as parseCsv } from "csv-parse/sync";
import xlsx from "xlsx";

import { createR2Client, getR2ObjectBytes } from "../storage/r2.js";
import type { WorkerEnv } from "../env.js";

function detectLocale(text: string): "en" | "ar" {
  const sample = text.slice(0, 4000);
  const ar = (sample.match(/[\u0600-\u06FF]/g) ?? []).length;
  const other = sample.length - ar;
  if (ar > 0 && ar / Math.max(1, other) > 0.1) return "ar";
  return "en";
}

function chunkText(text: string, maxLen = 1200) {
  const cleaned = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const parts = cleaned.split(/\n\n+/g).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (const p of parts) {
    if (!buf.length) {
      buf = p;
      continue;
    }
    if ((buf + "\n\n" + p).length <= maxLen) {
      buf += "\n\n" + p;
      continue;
    }
    chunks.push(buf);
    buf = p;
  }
  if (buf.length) chunks.push(buf);
  if (!chunks.length && cleaned.length) chunks.push(cleaned.slice(0, maxLen));
  return chunks;
}

function stripHtml(html: string) {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  return withoutScripts
    .replace(/<\/(p|div|br|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractTextFromFile(args: { bytes: Uint8Array; filename?: string | null; mimeType?: string | null }) {
  const name = String(args.filename ?? "");
  const lower = name.toLowerCase();
  const mime = String(args.mimeType ?? "").toLowerCase();
  const buf = Buffer.from(args.bytes);

  const isPdf = mime.includes("pdf") || lower.endsWith(".pdf");
  const isDocx = mime.includes("docx") || lower.endsWith(".docx");
  const isTxt = mime.startsWith("text/") || lower.endsWith(".txt");
  const isCsv = mime.includes("csv") || lower.endsWith(".csv");
  const isXlsx = mime.includes("spreadsheet") || lower.endsWith(".xlsx") || lower.endsWith(".xls");

  if (isPdf) {
    const parser = new PDFParse({ data: buf });
    const res = await parser.getText();
    await parser.destroy().catch(() => void 0);
    return res.text ?? "";
  }
  if (isDocx) {
    const res = await mammoth.extractRawText({ buffer: buf });
    return res.value ?? "";
  }
  if (isCsv) {
    const records = parseCsv(buf, { columns: false, skip_empty_lines: true });
    return (records as any[]).map((r) => (Array.isArray(r) ? r.join(" | ") : String(r))).join("\n");
  }
  if (isXlsx) {
    const wb = xlsx.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames?.[0];
    if (!sheetName) return "";
    const ws = wb.Sheets[sheetName];
    if (!ws) return "";
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[];
    return rows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "")).join(" | ") : String(r))).join("\n");
  }
  if (isTxt) return buf.toString("utf8");
  return buf.toString("utf8");
}

async function extractTextFromUrl(url: string) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const contentType = String(res.headers.get("content-type") ?? "");
  const text = await res.text();
  if (contentType.includes("text/html") || text.trim().startsWith("<")) return stripHtml(text);
  return text;
}

export async function ingestKnowledgeSource(args: { prisma: PrismaClient; env: WorkerEnv; businessId: string; sourceId: string }) {
  const src = await args.prisma.knowledgeSource.findUnique({ where: { id: args.sourceId } });
  if (!src || src.deletedAt) return;
  if (src.businessId !== args.businessId) return;

  await args.prisma.knowledgeSource.update({
    where: { id: src.id },
    data: { status: KnowledgeSourceStatus.PENDING, errorMessage: null }
  });

  try {
    let extracted = "";
    if (src.type === KnowledgeSourceType.URL) {
      if (!src.sourceUrl) throw new Error("Missing sourceUrl");
      extracted = await extractTextFromUrl(src.sourceUrl);
    } else {
      if (!src.r2Key) throw new Error("Missing r2Key");
      const client = createR2Client(args.env);
      if (!client || !args.env.R2_BUCKET) throw new Error("R2 not configured");
      const bytes = await getR2ObjectBytes({ client, bucket: args.env.R2_BUCKET, key: src.r2Key });
      extracted = await extractTextFromFile({ bytes, filename: src.filename, mimeType: src.mimeType });
    }

    const locale = detectLocale(extracted);
    const chunks = chunkText(extracted);

    await args.prisma.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({ where: { businessId: src.businessId, sourceId: src.id } });
      if (chunks.length) {
        await tx.knowledgeChunk.createMany({
          data: chunks.map((c, i) => ({
            businessId: src.businessId,
            sourceId: src.id,
            chunkIndex: i,
            locale,
            contentText: c
          }))
        });
      }
      await tx.knowledgeSource.update({
        where: { id: src.id },
        data: {
          status: KnowledgeSourceStatus.READY,
          extractedText: extracted.slice(0, 2_000_000),
          errorMessage: null
        }
      });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await args.prisma.knowledgeSource.update({
      where: { id: src.id },
      data: { status: KnowledgeSourceStatus.FAILED, errorMessage: msg }
    });
  }
}

