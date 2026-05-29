export type TelephonyProviderName = "twilio" | "telnyx" | "plivo";

export type IngestedTelephonyEvent = {
  provider: TelephonyProviderName;
  providerCallId: string;
  eventType: string;
  occurredAt: Date;
  payload: unknown;
  direction?: "INBOUND" | "OUTBOUND";
  fromNumber?: string;
  toNumber?: string;
  recordingUrl?: string;
  transcriptText?: string;
  durationSeconds?: number;
  telephonyCostUsd?: number;
};

export interface TelephonyProviderAdapter {
  name: TelephonyProviderName;
  verifyWebhook(args: {
    rawBody: string;
    headers: Record<string, string | string[] | undefined>;
    url: string;
  }): boolean;
  parseEvent(args: { body: any; headers: Record<string, string | string[] | undefined> }): IngestedTelephonyEvent;
}

