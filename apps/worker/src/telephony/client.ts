import type { OutboundCallRequest, OutboundCallResult, ProviderCredentials, TelephonyProviderName } from "./types.js";
import { twilioCreateOutboundCall } from "./providers/twilio.js";
import { telnyxCreateOutboundCall } from "./providers/telnyx.js";
import { plivoCreateOutboundCall } from "./providers/plivo.js";

export async function createOutboundCall(args: {
  provider: TelephonyProviderName;
  credentials: ProviderCredentials;
  req: OutboundCallRequest;
}): Promise<OutboundCallResult> {
  if (args.provider === "twilio") {
    if (args.credentials.provider !== "twilio") throw new Error("Invalid credentials for twilio");
    return twilioCreateOutboundCall({ accountSid: args.credentials.accountSid, authToken: args.credentials.authToken, req: args.req });
  }
  if (args.provider === "telnyx") {
    if (args.credentials.provider !== "telnyx") throw new Error("Invalid credentials for telnyx");
    return telnyxCreateOutboundCall({ apiKey: args.credentials.apiKey, req: args.req });
  }
  if (args.credentials.provider !== "plivo") throw new Error("Invalid credentials for plivo");
  return plivoCreateOutboundCall({ authId: args.credentials.authId, authToken: args.credentials.authToken, req: args.req });
}

