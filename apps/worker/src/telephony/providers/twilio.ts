import type { OutboundCallRequest, OutboundCallResult } from "../types.js";

export async function twilioCreateOutboundCall(args: {
  accountSid: string;
  authToken: string;
  req: OutboundCallRequest;
}): Promise<OutboundCallResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(args.accountSid)}/Calls.json`;
  const params = new URLSearchParams();
  params.set("To", args.req.to);
  params.set("From", args.req.from);
  params.set("Url", args.req.answerUrl);
  params.set("StatusCallback", args.req.statusCallbackUrl);
  for (const ev of ["initiated", "ringing", "answered", "completed"]) {
    params.append("StatusCallbackEvent", ev);
  }
  params.set("Record", args.req.record ? "true" : "false");
  const body = params.toString();

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

