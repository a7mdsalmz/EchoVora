import type { FastifyPluginAsync } from "fastify";
import multipart from "@fastify/multipart";
import { z } from "zod";
import { prisma } from "../db.js";
import { RoleKey, AgentStatus, AgentType, KnowledgeSourceStatus, KnowledgeSourceType, UsageType } from "@prisma/client";
import { createRedis } from "../queues/redis.js";
import { createKnowledgeIngestQueue } from "../queues/knowledgeIngest.js";
import { createR2Client, putR2Object } from "../storage/r2.js";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { parse as parseCsv } from "csv-parse/sync";
import xlsx from "xlsx";

const AgentCreateBody = z.object({
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  defaultLocale: z.enum(["en", "ar"]).optional(),
  status: z.nativeEnum(AgentStatus).optional(),
  config: z.record(z.unknown()).optional(),
  knowledgeBaseIds: z.array(z.string().min(1)).optional()
});

const AgentUpdateBody = AgentCreateBody.partial();

const KnowledgeBaseCreateBody = z.object({
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional()
});

const KnowledgeBaseUpdateBody = KnowledgeBaseCreateBody.partial();

const SourceUrlBody = z.object({
  title: z.string().optional(),
  url: z.string().url(),
  locale: z.enum(["en", "ar"]).optional()
});

const UnansweredQuery = z.object({
  resolved: z.enum(["true", "false"]).optional()
});

function detectLocale(text: string): "en" | "ar" {
  const sample = text.slice(0, 4000);
  const ar = (sample.match(/[\u0600-\u06FF]/g) ?? []).length;
  const other = sample.length - ar;
  if (ar > 0 && ar / Math.max(1, other) > 0.1) return "ar";
  return "en";
}

function chunkText(text: string, maxLen = 1200) {
  const cleaned = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const parts = cleaned
    .split(/\n\n+/g)
    .map((p) => p.trim())
    .filter(Boolean);
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

export const callCenterRoutes: FastifyPluginAsync = async (app) => {
  await app.register(multipart, {
    limits: { fileSize: 15 * 1024 * 1024 }
  });

  let redis: any | null = null;
  let queue: any | null = null;
  function getQueue() {
    if (!redis) redis = createRedis(app.config.REDIS_URL);
    if (!queue) queue = createKnowledgeIngestQueue(redis);
    return queue;
  }
  app.addHook("onClose", async () => {
    await queue?.close();
    await redis?.quit();
  });

  app.get("/call-center/agents", { preHandler: [app.authorize(RoleKey.VIEWER)] }, async (req) => {
    const rows = await prisma.agent.findMany({
      where: { businessId: req.user.businessId, type: AgentType.VOICE_CALL_CENTER, deletedAt: null },
      orderBy: { updatedAt: "desc" }
    });
    return { agents: rows };
  });

  app.post("/call-center/agents", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req) => {
    const body = AgentCreateBody.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const agent = await tx.agent.create({
        data: {
          businessId: req.user.businessId,
          type: AgentType.VOICE_CALL_CENTER,
          status: body.status ?? AgentStatus.ACTIVE,
          nameEn: body.nameEn,
          nameAr: body.nameAr,
          descriptionEn: body.descriptionEn,
          descriptionAr: body.descriptionAr,
          defaultLocale: body.defaultLocale ?? "en",
          config: (body.config ?? {}) as any
        }
      });
      if (body.knowledgeBaseIds?.length) {
        await tx.agentKnowledgeBase.createMany({
          data: body.knowledgeBaseIds.map((kbId) => ({
            businessId: req.user.businessId,
            agentId: agent.id,
            knowledgeBaseId: kbId
          })),
          skipDuplicates: true
        });
      }
      return agent;
    });
    return { agent: created };
  });

  app.patch("/call-center/agents/:id", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req, reply) => {
    const id = String((req.params as any)?.id ?? "");
    if (!id) return reply.badRequest("Missing id");
    const body = AgentUpdateBody.parse(req.body);
    const existing = await prisma.agent.findFirst({ where: { id, businessId: req.user.businessId, type: AgentType.VOICE_CALL_CENTER, deletedAt: null } });
    if (!existing) return reply.notFound();

    const updated = await prisma.$transaction(async (tx) => {
      const agent = await tx.agent.update({
        where: { id },
        data: {
          status: body.status,
          nameEn: body.nameEn,
          nameAr: body.nameAr,
          descriptionEn: body.descriptionEn,
          descriptionAr: body.descriptionAr,
          defaultLocale: body.defaultLocale,
          config: body.config ? (body.config as any) : undefined
        }
      });
      if (body.knowledgeBaseIds) {
        await tx.agentKnowledgeBase.deleteMany({ where: { businessId: req.user.businessId, agentId: id } });
        if (body.knowledgeBaseIds.length) {
          await tx.agentKnowledgeBase.createMany({
            data: body.knowledgeBaseIds.map((kbId) => ({
              businessId: req.user.businessId,
              agentId: id,
              knowledgeBaseId: kbId
            })),
            skipDuplicates: true
          });
        }
      }
      return agent;
    });
    return { agent: updated };
  });

  app.delete("/call-center/agents/:id", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req, reply) => {
    const id = String((req.params as any)?.id ?? "");
    if (!id) return reply.badRequest("Missing id");
    const existing = await prisma.agent.findFirst({ where: { id, businessId: req.user.businessId, type: AgentType.VOICE_CALL_CENTER, deletedAt: null } });
    if (!existing) return reply.notFound();
    await prisma.agent.update({ where: { id }, data: { deletedAt: new Date(), status: AgentStatus.DISABLED } });
    return { ok: true };
  });

  app.get("/call-center/knowledge-bases", { preHandler: [app.authorize(RoleKey.VIEWER)] }, async (req) => {
    const rows = await prisma.knowledgeBase.findMany({
      where: { businessId: req.user.businessId, deletedAt: null },
      orderBy: { updatedAt: "desc" }
    });
    return { knowledgeBases: rows };
  });

  app.post("/call-center/knowledge-bases", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req) => {
    const body = KnowledgeBaseCreateBody.parse(req.body);
    const kb = await prisma.knowledgeBase.create({
      data: {
        businessId: req.user.businessId,
        nameEn: body.nameEn,
        nameAr: body.nameAr,
        descriptionEn: body.descriptionEn,
        descriptionAr: body.descriptionAr,
        content: [] as any
      }
    });
    return { knowledgeBase: kb };
  });

  app.patch("/call-center/knowledge-bases/:id", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req, reply) => {
    const id = String((req.params as any)?.id ?? "");
    if (!id) return reply.badRequest("Missing id");
    const body = KnowledgeBaseUpdateBody.parse(req.body);
    const existing = await prisma.knowledgeBase.findFirst({ where: { id, businessId: req.user.businessId, deletedAt: null } });
    if (!existing) return reply.notFound();
    const updated = await prisma.knowledgeBase.update({
      where: { id },
      data: {
        nameEn: body.nameEn,
        nameAr: body.nameAr,
        descriptionEn: body.descriptionEn,
        descriptionAr: body.descriptionAr
      }
    });
    return { knowledgeBase: updated };
  });

  app.delete("/call-center/knowledge-bases/:id", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req, reply) => {
    const id = String((req.params as any)?.id ?? "");
    if (!id) return reply.badRequest("Missing id");
    const existing = await prisma.knowledgeBase.findFirst({ where: { id, businessId: req.user.businessId, deletedAt: null } });
    if (!existing) return reply.notFound();
    await prisma.knowledgeBase.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  });

  app.get("/call-center/knowledge-bases/:id/sources", { preHandler: [app.authorize(RoleKey.VIEWER)] }, async (req, reply) => {
    const id = String((req.params as any)?.id ?? "");
    if (!id) return reply.badRequest("Missing id");
    const kb = await prisma.knowledgeBase.findFirst({ where: { id, businessId: req.user.businessId, deletedAt: null } });
    if (!kb) return reply.notFound();
    const rows = await prisma.knowledgeSource.findMany({
      where: { businessId: req.user.businessId, knowledgeBaseId: id, deletedAt: null },
      orderBy: { updatedAt: "desc" }
    });
    return { sources: rows };
  });

  app.post("/call-center/knowledge-bases/:id/sources/url", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req, reply) => {
    const id = String((req.params as any)?.id ?? "");
    if (!id) return reply.badRequest("Missing id");
    const body = SourceUrlBody.parse(req.body);
    const kb = await prisma.knowledgeBase.findFirst({ where: { id, businessId: req.user.businessId, deletedAt: null } });
    if (!kb) return reply.notFound();

    const source = await prisma.knowledgeSource.create({
      data: {
        businessId: req.user.businessId,
        knowledgeBaseId: id,
        type: KnowledgeSourceType.URL,
        status: KnowledgeSourceStatus.PENDING,
        title: body.title ?? body.url,
        sourceUrl: body.url
      }
    });

    await getQueue().add("ingest", { businessId: req.user.businessId, sourceId: source.id }, { jobId: `ki:${req.user.businessId}:${source.id}` });
    return { source };
  });

  app.post("/call-center/knowledge-bases/:id/sources/upload", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req, reply) => {
    const id = String((req.params as any)?.id ?? "");
    if (!id) return reply.badRequest("Missing id");
    const kb = await prisma.knowledgeBase.findFirst({ where: { id, businessId: req.user.businessId, deletedAt: null } });
    if (!kb) return reply.notFound();

    const file = await (req as any).file();
    if (!file) return reply.badRequest("Missing file");
    const buf = await file.toBuffer();
    const filename = String(file.filename ?? "upload");
    const mimeType = String(file.mimetype ?? "application/octet-stream");

    const source = await prisma.knowledgeSource.create({
      data: {
        businessId: req.user.businessId,
        knowledgeBaseId: id,
        type: KnowledgeSourceType.FILE,
        status: KnowledgeSourceStatus.PENDING,
        title: filename,
        filename,
        mimeType
      }
    });

    const r2 = createR2Client(app.config);
    const canUseR2 = Boolean(r2 && app.config.R2_BUCKET);

    if (canUseR2 && r2 && app.config.R2_BUCKET) {
      const r2Key = `kb/${req.user.businessId}/${id}/${source.id}/${filename}`;
      await putR2Object({
        client: r2,
        bucket: app.config.R2_BUCKET,
        key: r2Key,
        body: buf,
        contentType: mimeType
      });

      const updated = await prisma.knowledgeSource.update({ where: { id: source.id }, data: { r2Key } });
      await prisma.usageLog.create({
        data: {
          businessId: req.user.businessId,
          type: UsageType.STORAGE_BYTES,
          quantity: BigInt(buf.byteLength),
          costUsd: 0
        }
      });
      await getQueue().add("ingest", { businessId: req.user.businessId, sourceId: updated.id }, { jobId: `ki:${req.user.businessId}:${updated.id}` });
      return { source: updated };
    }

    try {
      const extracted = await extractTextFromFile({ bytes: buf, filename, mimeType });
      const locale = detectLocale(extracted);
      const chunks = chunkText(extracted);
      const updated = await prisma.$transaction(async (tx) => {
        await tx.knowledgeChunk.deleteMany({ where: { businessId: req.user.businessId, sourceId: source.id } });
        if (chunks.length) {
          await tx.knowledgeChunk.createMany({
            data: chunks.map((c, i) => ({
              businessId: req.user.businessId,
              sourceId: source.id,
              chunkIndex: i,
              locale,
              contentText: c
            }))
          });
        }
        return tx.knowledgeSource.update({
          where: { id: source.id },
          data: { status: KnowledgeSourceStatus.READY, extractedText: extracted.slice(0, 2_000_000), errorMessage: null }
        });
      });
      return { source: updated };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const updated = await prisma.knowledgeSource.update({
        where: { id: source.id },
        data: { status: KnowledgeSourceStatus.FAILED, errorMessage: msg }
      });
      return { source: updated };
    }
  });

  app.delete("/call-center/sources/:id", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req, reply) => {
    const id = String((req.params as any)?.id ?? "");
    if (!id) return reply.badRequest("Missing id");
    const existing = await prisma.knowledgeSource.findFirst({ where: { id, businessId: req.user.businessId, deletedAt: null } });
    if (!existing) return reply.notFound();
    await prisma.knowledgeSource.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  });

  app.get("/call-center/unanswered", { preHandler: [app.authorize(RoleKey.VIEWER)] }, async (req) => {
    const q = UnansweredQuery.parse(req.query);
    const where: any = { businessId: req.user.businessId };
    if (q.resolved === "true") where.resolvedAt = { not: null };
    if (q.resolved === "false") where.resolvedAt = null;
    const rows = await prisma.unansweredQuestion.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    return { unanswered: rows };
  });
};

