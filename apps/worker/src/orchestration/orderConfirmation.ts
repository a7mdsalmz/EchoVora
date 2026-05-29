import { OrderStatus, CallStatus } from "@prisma/client";

export function inferOrderOutcome(args: { callStatus: CallStatus; eventType: string }): OrderStatus {
  const et = args.eventType.toLowerCase();
  if (et.includes("confirmed") || et.includes("accept")) return OrderStatus.CONFIRMED;
  if (et.includes("rejected") || et.includes("reject") || et.includes("cancel")) return OrderStatus.REJECTED;
  if (et.includes("reschedule") || et.includes("callback")) return OrderStatus.RESCHEDULED;
  if (et.includes("address")) return OrderStatus.CHANGE_ADDRESS;
  if (et.includes("no_answer") || et.includes("noanswer") || et.includes("busy") || et.includes("timeout")) return OrderStatus.NO_ANSWER;
  if (args.callStatus === CallStatus.FAILED || args.callStatus === CallStatus.CANCELED) return OrderStatus.NO_ANSWER;
  if (args.callStatus === CallStatus.COMPLETED) return OrderStatus.HUMAN_REVIEW;
  return OrderStatus.HUMAN_REVIEW;
}

export function retryDelayMsForAttempt(nextAttemptNumber: number): number {
  if (nextAttemptNumber <= 1) return 5 * 60 * 1000;
  if (nextAttemptNumber === 2) return 30 * 60 * 1000;
  return 2 * 60 * 60 * 1000;
}

export function isTerminalOrderStatus(s: OrderStatus): boolean {
  return (
    s === OrderStatus.CONFIRMED ||
    s === OrderStatus.REJECTED ||
    s === OrderStatus.RESCHEDULED ||
    s === OrderStatus.CHANGE_ADDRESS ||
    s === OrderStatus.FAILED ||
    s === OrderStatus.HUMAN_REVIEW
  );
}

