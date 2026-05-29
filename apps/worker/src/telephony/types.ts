export type TelephonyProviderName = "twilio" | "telnyx" | "plivo";

export type OutboundCallRequest = {
  to: string;
  from: string;
  answerUrl: string;
  statusCallbackUrl: string;
  record: boolean;
};

export type OutboundCallResult = {
  providerCallId: string;
  raw?: unknown;
};

export type ProviderCredentials =
  | { provider: "twilio"; accountSid: string; authToken: string }
  | { provider: "telnyx"; apiKey: string }
  | { provider: "plivo"; authId: string; authToken: string };

