import { createHmac, timingSafeEqual } from "node:crypto";

export const SUPPORT_PRODUCT = "my-impact-director";
export function maximumContribution() {
  const value = Number(process.env.CONTRIBUTIONS_MAX_PENCE || 100000);
  return Number.isSafeInteger(value) && value >= 2000 && value <= 1000000
    ? value
    : 100000;
}
export { contributionPence } from "./contribution-amounts";
export function verifyStripeSignature(
  raw: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  const fields = signature.split(",").map((part) => part.split("="));
  const timestamps = fields.filter(([key]) => key === "t");
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamps[0][1] || ""))
    return false;
  const timestamp = timestamps[0][1];
  if (!secret || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest();
  return fields
    .filter(([key]) => key === "v1")
    .some(([, hex]) => {
      if (!/^[a-fA-F0-9]{64}$/.test(hex || "")) return false;
      return timingSafeEqual(digest, Buffer.from(hex, "hex"));
    });
}
export function paymentState(
  session: {
    status?: string;
    payment_status?: string;
    payment_intent?:
      | { status?: string; latest_charge?: { amount_refunded?: number } }
      | string
      | null;
  },
  amount: number,
) {
  const intent =
    typeof session.payment_intent === "object" ? session.payment_intent : null;
  const refunded = Math.max(
    0,
    Math.min(amount, intent?.latest_charge?.amount_refunded || 0),
  );
  if (refunded)
    return {
      status: refunded >= amount ? "refunded" : "partially_refunded",
      refunded,
    };
  if (session.payment_status === "paid")
    return { status: "succeeded", refunded: 0 };
  if (session.status === "expired") return { status: "cancelled", refunded: 0 };
  if (intent?.status === "processing" || session.status === "complete")
    return { status: "processing", refunded: 0 };
  if (intent?.status === "requires_payment_method")
    return { status: "failed", refunded: 0 };
  return { status: "pending", refunded: 0 };
}
