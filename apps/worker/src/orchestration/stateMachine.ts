import type { CallStatus } from "@prisma/client";

export function reduceCallStatus(prevStatus: CallStatus, eventType: string): CallStatus {
  const et = eventType.toLowerCase();
  if (et.includes("completed") || et.includes("ended")) return "COMPLETED";
  if (et.includes("failed") || et.includes("error")) return "FAILED";
  if (prevStatus === "NEW") return "IN_PROGRESS";
  return prevStatus;
}

