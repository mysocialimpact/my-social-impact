export const assessmentTiers = ["advanced", "ultimate", "human"] as const;
export type AssessmentTier = (typeof assessmentTiers)[number];
export const assessmentPrices: Record<AssessmentTier, number> = {
  advanced: 1900,
  ultimate: 2900,
  human: 14900,
};
export const assessmentTierNames: Record<AssessmentTier, string> = {
  advanced: "Advanced AI",
  ultimate: "Ultimate AI",
  human: "Human Intelligence",
};

export type SettledAssessmentPayment = {
  tier: AssessmentTier;
  paid_pence: number;
  refunded_pence: number;
  blocked_pence: number;
  discount_pence: number;
};

export function eligibleAssessmentPayments(
  payments: readonly SettledAssessmentPayment[],
) {
  return payments.reduce(
    (sum, payment) =>
      sum + payment.paid_pence - payment.refunded_pence - payment.blocked_pence,
    0,
  );
}

export function assessmentQuote(
  tier: AssessmentTier,
  previouslyPaid: number,
  discount = 0,
) {
  if (
    !Number.isSafeInteger(previouslyPaid) ||
    previouslyPaid < 0 ||
    !Number.isSafeInteger(discount) ||
    discount < 0 ||
    discount > (tier === "human" ? 11900 : 0)
  ) {
    throw new RangeError("Invalid assessment pricing inputs.");
  }
  const list = assessmentPrices[tier];
  const packageTotal = list - discount;
  const credit = Math.min(packageTotal, previouslyPaid);
  return {
    tier,
    list,
    discount,
    credit,
    packageTotal,
    due: packageTotal - credit,
  };
}

export function assessmentEntitlement(
  payments: readonly SettledAssessmentPayment[],
) {
  const net = eligibleAssessmentPayments(payments);
  const purchasedHuman = payments.find(
    (payment) =>
      payment.tier === "human" &&
      payment.paid_pence > payment.refunded_pence &&
      payment.blocked_pence === 0 &&
      net >= assessmentPrices.human - payment.discount_pence,
  );
  if (purchasedHuman) return "human";
  if (net >= assessmentPrices.ultimate) return "ultimate";
  if (net >= assessmentPrices.advanced) return "advanced";
  return "everyday";
}

export function applyProjectCredit(available: number, projectFee: number) {
  if (!Number.isSafeInteger(projectFee) || projectFee <= 0) {
    throw new RangeError("Enter a positive qualifying project fee in pence.");
  }
  const applied = Math.min(available, projectFee);
  return { applied, remaining: projectFee - applied };
}
