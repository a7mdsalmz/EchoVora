import type { OutboundCallRequest, OutboundCallResult } from "../types.js";

export async function plivoCreateOutboundCall(args: {
  authId: string;
  authToken: string;
  req: OutboundCallRequest;
}): Promise<OutboundCallResult> {
  const url = `https://api.plivo.com/v1/Account/${encodeURIComponent(args.authId)}/Call/`;
  const auth = Buffer.from(`${args.authId}:${args.authToken}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      to: args.req.to,
      from: args.req.from,
      answer_url: args.req.answerUrl,
      answer_method: "GET",
      callback_url: args.req.statusCallbackUrl,
      callback_method: "POST",
      record: args.req.record
    })
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Plivo call create failed: ${res.status} ${JSON.stringify(json)}`);
  const id = String((json as any)?.request_uuid ?? (json as any)?.call_uuid ?? "");
  if (!id) throw new Error("Plivo response missing request_uuid");
  return { providerCallId: id, raw: json };
}

