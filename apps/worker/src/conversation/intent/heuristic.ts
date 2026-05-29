import type { ArabicDialect, ConversationIntent, ConversationLocale } from "../types.js";

function norm(s: string) {
  return s.trim().toLowerCase();
}

function hasAny(text: string, list: string[]) {
  return list.some((w) => text.includes(w));
}

export function detectIntentHeuristic(args: {
  text: string;
  locale: ConversationLocale;
  dialect: ArabicDialect;
}): ConversationIntent {
  const t = norm(args.text);
  if (!t) return "UNKNOWN";

  const questionMarks = ["?", "؟"];
  if (questionMarks.some((m) => t.includes(m))) return "QUESTION";

  if (args.locale === "en") {
    if (hasAny(t, ["human", "agent", "representative", "support", "customer service"])) return "HUMAN_SUPPORT";
    if (hasAny(t, ["change address", "different address", "new address", "address change"])) return "CHANGE_ADDRESS";
    if (hasAny(t, ["reschedule", "another time", "later", "tomorrow", "next week", "change time"])) return "RESCHEDULE";
    if (hasAny(t, ["yes", "yep", "yeah", "correct", "that's right", "sure", "ok", "okay", "confirm"])) return "AFFIRM";
    if (hasAny(t, ["no", "nope", "wrong", "cancel", "reject", "don't", "do not"])) return "REJECT";
    if (hasAny(t, ["what", "why", "how", "when", "where", "price", "cost"])) return "QUESTION";
    return "UNKNOWN";
  }

  const arHuman = ["موظف", "بشر", "إنسان", "خدمة العملاء", "الدعم", "مندوب"];
  const arChangeAddress = ["تغيير العنوان", "غير العنوان", "العنوان غلط", "عنوان جديد", "بدل العنوان", "العنوان مختلف"];
  const arReschedule = ["تأجيل", "غير الموعد", "موعد تاني", "بعد كده", "بكره", "الاسبوع الجاي", "غير وقت"];
  const arYes = ["نعم", "ايوه", "أيوه", "تمام", "صح", "موافق", "اوكي", "حاضر", "أكيد"];
  const arNo = ["لا", "لأ", "مش", "غلط", "إلغاء", "الغاء", "ارفض", "رفض", "مش موافق"];
  const arQuestion = ["كم", "بكام", "ليه", "ازاي", "إمتى", "امتى", "فين", "متى", "ماذا", "ايه", "ما", "سعر", "تكلفة"];

  if (hasAny(t, arHuman)) return "HUMAN_SUPPORT";
  if (hasAny(t, arChangeAddress)) return "CHANGE_ADDRESS";
  if (hasAny(t, arReschedule)) return "RESCHEDULE";
  if (hasAny(t, arYes)) return "AFFIRM";
  if (hasAny(t, arNo)) return "REJECT";
  if (hasAny(t, arQuestion)) return "QUESTION";

  if (args.dialect === "ar-EG") {
    if (hasAny(t, ["فين", "امتى", "ازاي", "ليه", "يعني"])) return "QUESTION";
    if (hasAny(t, ["عايز", "عاوزه", "ممكن", "ينفع"])) return "QUESTION";
  }

  return "UNKNOWN";
}

