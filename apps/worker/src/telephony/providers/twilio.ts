import type { OutboundCallRequest, OutboundCallResult } from "../types.js";

function formEncode(data: Record<string, string>) {
  return new URLSearchParams(data).toString();
}

export async function twilioCreateOutboundCall(args: {
  accountSid: string;
  authToken: string;
  req: OutboundCallRequest;
}): Promise<OutboundCallResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(args.accountSid)}/Calls.json`;
  const body = formEncode({
    To: args.req.to,
    From: args.req.from,
    Url: args.req.answerUrl,
    StatusCallback: args.req.statusCallbackUrl,
    StatusCallbackEvent: "initiated ringing answered completed",
    Record: args.req.record ? "true" : "false"
  });

  const auth = Buffer.from(`${args.accountSid}:${args.authToken}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Twilio call create failed: ${res.status} ${JSON.stringify(json)}`);
  const sid = String((json as any)?.sid ?? "");
  if (!sid) throw new Error("Twilio response missing sid");
  return { providerCallId: sid, raw: json };
}

