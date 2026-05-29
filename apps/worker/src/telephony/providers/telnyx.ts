import type { OutboundCallRequest, OutboundCallResult } from "../types.js";

export async function telnyxCreateOutboundCall(args: { apiKey: string; req: OutboundCallRequest }): Promise<OutboundCallResult> {
  const res = await fetch("https://api.telnyx.com/v2/calls", {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      to: args.req.to,
      from: args.req.from,
      webhook_url: args.req.statusCallbackUrl,
      webhook_url_method: "POST",
      record: args.req.record,
      answer_url: args.req.answerUrl,
      answer_url_method: "GET"
    })
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Telnyx call create failed: ${res.status} ${JSON.stringify(json)}`);
  const id = String((json as any)?.data?.call_control_id ?? (json as any)?.data?.id ?? "");
  if (!id) throw new Error("Telnyx response missing call_control_id");
  return { providerCallId: id, raw: json };
}

