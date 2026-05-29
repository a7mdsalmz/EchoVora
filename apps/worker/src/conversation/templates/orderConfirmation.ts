import type { ArabicDialect, ConversationLocale, ConversationState, ConversationVariables } from "../types.js";

export type FlowTemplate = {
  key: string;
  initial: ConversationState;
  renderPrompt: (args: {
    state: ConversationState;
    locale: ConversationLocale;
    dialect: ArabicDialect;
    v: ConversationVariables;
  }) => string;
};

function vOr(v: string | undefined, fallback: string) {
  return v && v.trim().length ? v : fallback;
}

export const orderConfirmationFlow: FlowTemplate = {
  key: "order_confirmation_v1",
  initial: "GREETING",
  renderPrompt: ({ state, locale, dialect, v }) => {
    const name = locale === "ar" ? vOr(v.customerName, "حضرتك") : vOr(v.customerName, "there");
    const biz = locale === "ar" ? vOr(v.businessName, "المتجر") : vOr(v.businessName, "the store");
    const items = locale === "ar" ? vOr(v.orderItems, "طلبك") : vOr(v.orderItems, "your order");
    const price = locale === "ar" ? vOr(v.totalPrice, "") : vOr(v.totalPrice, "");
    const address = locale === "ar" ? vOr(v.address, "العنوان المسجّل") : vOr(v.address, "your saved address");
    const date = locale === "ar" ? vOr(v.deliveryDate, "موعد التوصيل") : vOr(v.deliveryDate, "delivery time");

    if (locale === "ar" && dialect === "ar-EG") {
      switch (state) {
        case "GREETING":
          return `أهلاً يا ${name}. أنا مساعد تأكيد الطلبات من ${biz}. ينفع آخد دقيقة؟`;
        case "CONFIRM_IDENTITY":
          return `حضرتك ${name} صح؟`;
        case "CONFIRM_ORDER_DETAILS":
          return price ? `الطلب ${items} بإجمالي ${price}. تمام؟` : `الطلب ${items}. تمام؟`;
        case "CONFIRM_ADDRESS":
          return `العنوان هو ${address}. صحيح؟ لو محتاج تغيّر العنوان قولّي.`;
        case "CONFIRM_DELIVERY_TIME":
          return `التوصيل ${date}. مناسب؟`;
        case "FINAL_CONFIRMATION":
          return `تمام. نأكد الطلب دلوقتي؟`;
        case "HANDOFF_HUMAN":
          return `حاضر. هحوّلك لموظف خدمة العملاء.`;
        case "SAVE_RESULT":
          return `تمام. شكراً.`;
        case "END":
          return `مع السلامة.`;
      }
    }

    if (locale === "ar") {
      switch (state) {
        case "GREETING":
          return `مرحباً ${name}. أنا مساعد تأكيد الطلبات من ${biz}. هل لديك دقيقة؟`;
        case "CONFIRM_IDENTITY":
          return `هل أتحدث مع ${name}؟`;
        case "CONFIRM_ORDER_DETAILS":
          return price ? `لتأكيد الطلب: ${items} بإجمالي ${price}. هل هذا صحيح؟` : `لتأكيد الطلب: ${items}. هل هذا صحيح؟`;
        case "CONFIRM_ADDRESS":
          return `عنوان التوصيل هو ${address}. هل هذا صحيح؟ إذا رغبت بتغيير العنوان أخبرني.`;
        case "CONFIRM_DELIVERY_TIME":
          return `موعد التوصيل هو ${date}. هل يناسبك؟`;
        case "FINAL_CONFIRMATION":
          return `هل تؤكد الطلب نهائياً؟`;
        case "HANDOFF_HUMAN":
          return `حسناً. سأقوم بتحويلك إلى موظف خدمة العملاء.`;
        case "SAVE_RESULT":
          return `تم. شكراً لك.`;
        case "END":
          return `شكراً. مع السلامة.`;
      }
    }

    switch (state) {
      case "GREETING":
        return `Hi ${name}. This is the order confirmation assistant from ${biz}. Do you have a minute?`;
      case "CONFIRM_IDENTITY":
        return `Am I speaking with ${name}?`;
      case "CONFIRM_ORDER_DETAILS":
        return price ? `To confirm your order: ${items}, total ${price}. Is that correct?` : `To confirm your order: ${items}. Is that correct?`;
      case "CONFIRM_ADDRESS":
        return `Your delivery address is ${address}. Is that correct? If you need to change the address, tell me.`;
      case "CONFIRM_DELIVERY_TIME":
        return `Your delivery time is ${date}. Does that work for you?`;
      case "FINAL_CONFIRMATION":
        return `Final check: should I confirm the order now?`;
      case "HANDOFF_HUMAN":
        return `Okay. I'll transfer you to a human agent.`;
      case "SAVE_RESULT":
        return `Done. Thanks.`;
      case "END":
        return `Goodbye.`;
    }
  }
};

