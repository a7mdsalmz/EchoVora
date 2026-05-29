export type ConversationLocale = "en" | "ar";
export type ArabicDialect = "ar" | "ar-EG";

export type ConversationIntent =
  | "AFFIRM"
  | "REJECT"
  | "UNKNOWN"
  | "QUESTION"
  | "CHANGE_ADDRESS"
  | "RESCHEDULE"
  | "HUMAN_SUPPORT";

export type ConversationState =
  | "GREETING"
  | "CONFIRM_IDENTITY"
  | "CONFIRM_ORDER_DETAILS"
  | "CONFIRM_ADDRESS"
  | "CONFIRM_DELIVERY_TIME"
  | "FINAL_CONFIRMATION"
  | "SAVE_RESULT"
  | "HANDOFF_HUMAN"
  | "END";

export type VoiceSettings = {
  provider: "elevenlabs";
  voiceId: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
};

export type ConversationVariables = {
  customerName?: string;
  businessName?: string;
  orderItems?: string;
  totalPrice?: string;
  address?: string;
  deliveryDate?: string;
};

export type RenderedPrompt = {
  text: string;
};

