import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";

export type ImportedOrderRow = {
  externalId?: string;
  customerName?: string;
  customerPhone: string;
  customerEmail?: string;
  amount?: string | number;
  currency?: string;
  notes?: string;
  address?: string;
  items?: string;
};

export function normalizePhone(input: string): string {
  return input
    .trim()
    .replace(/[^\d+]/g, "")
    .replace(/^00/, "+");
}

function pickString(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

export function parseOrdersBuffer(args: { filename?: string; buffer: Buffer }): ImportedOrderRow[] {
  const name = (args.filename ?? "").toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const wb = XLSX.read(args.buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];
    const ws = wb.Sheets[sheetName];
    if (!ws) return [];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    const out: ImportedOrderRow[] = [];
    for (const r of rows) {
      const phone = pickString(r.phone ?? r.Phone ?? r.mobile ?? r.Mobile ?? r.customerPhone ?? r.CustomerPhone);
      if (!phone) continue;
      out.push({
        externalId: pickString(r.externalId ?? r.ExternalId ?? r.orderId ?? r.OrderId),
        customerName: pickString(r.customerName ?? r.CustomerName ?? r.name ?? r.Name),
        customerPhone: normalizePhone(phone),
        customerEmail: pickString(r.customerEmail ?? r.CustomerEmail ?? r.email ?? r.Email),
        amount: pickString(r.amount ?? r.Amount),
        currency: pickString(r.currency ?? r.Currency),
        notes: pickString(r.notes ?? r.Notes),
        address: pickString(r.address ?? r.Address),
        items: pickString(r.items ?? r.Items)
      });
    }
    return out;
  }

  const text = args.buffer.toString("utf8");
  const records = parseCsv(text, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    trim: true
  }) as Array<Record<string, unknown>>;

  const out: ImportedOrderRow[] = [];
  for (const r of records) {
    const phone = pickString(r.phone ?? r.Phone ?? r.mobile ?? r.Mobile ?? r.customerPhone ?? r.CustomerPhone);
    if (!phone) continue;
    out.push({
      externalId: pickString(r.externalId ?? r.ExternalId ?? r.orderId ?? r.OrderId),
      customerName: pickString(r.customerName ?? r.CustomerName ?? r.name ?? r.Name),
      customerPhone: normalizePhone(phone),
      customerEmail: pickString(r.customerEmail ?? r.CustomerEmail ?? r.email ?? r.Email),
      amount: pickString(r.amount ?? r.Amount),
      currency: pickString(r.currency ?? r.Currency),
      notes: pickString(r.notes ?? r.Notes),
      address: pickString(r.address ?? r.Address),
      items: pickString(r.items ?? r.Items)
    });
  }
  return out;
}

