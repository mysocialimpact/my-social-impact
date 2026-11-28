import {
  assessmentPrices,
  assessmentTierNames,
  assessmentTiers,
} from "../src/lib/assessment-pricing";
import {
  assessmentStripe,
  requireAssessmentStripe,
  verifyAssessmentMerchant,
} from "../src/lib/assessment-stripe";

const config = requireAssessmentStripe();
await verifyAssessmentMerchant(config);

const prices: Partial<Record<(typeof assessmentTiers)[number], string>> = {};
let humanProduct = "";
for (const tier of assessmentTiers) {
  const lookupKey = "my-impact-director-assessment-" + tier + "-gbp-v1";
  const query = new URLSearchParams({
    "lookup_keys[]": lookupKey,
    active: "true",
  });
  type Price = {
    id: string;
    product: string;
    unit_amount: number;
    currency: string;
    livemode: boolean;
  };
  const existing = await assessmentStripe<{ data: Price[] }>(
    config,
    "prices?" + query,
  );
  const price =
    existing.data[0] ??
    (await assessmentStripe<Price>(
      config,
      "prices",
      new URLSearchParams({
        currency: "gbp",
        unit_amount: String(assessmentPrices[tier]),
        lookup_key: lookupKey,
        "product_data[name]":
          "My Impact Director · " + assessmentTierNames[tier],
        "product_data[metadata][mid_assessment_tier]": tier,
      }),
      lookupKey,
    ));
  if (
    price.livemode ||
    price.currency !== "gbp" ||
    price.unit_amount !== assessmentPrices[tier]
  )
    throw new Error("The existing Sandbox price does not match " + tier);
  prices[tier] = price.id;
  if (tier === "human") humanProduct = price.product;
}

const couponId = "mid-human-founding50-v1";
const [coupon, promos] = await Promise.all([
  assessmentStripe<{ data: { id: string }[] }>(config, "coupons?limit=100"),
  assessmentStripe<{
    data: { id: string; code: string; coupon: { id: string } }[];
  }>(config, "promotion_codes?code=FOUNDING50&limit=100"),
]);
if (!coupon.data.some((c) => c.id === couponId)) {
  await assessmentStripe(
    config,
    "coupons",
    new URLSearchParams({
      id: couponId,
      name: "My Impact Director founding customer",
      currency: "gbp",
      amount_off: "5000",
      duration: "once",
      max_redemptions: "20",
      "applies_to[products][0]": humanProduct,
    }),
    couponId,
  );
}
const current = promos.data.find(
  (promotion) => promotion.coupon.id === couponId,
);
if (!current && promos.data.length)
  throw new Error("FOUNDING50 already exists for a different Sandbox coupon.");
const promotion =
  current ??
  (await assessmentStripe<{ id: string }>(
    config,
    "promotion_codes",
    new URLSearchParams({
      coupon: couponId,
      code: "FOUNDING50",
      max_redemptions: "20",
    }),
    "mid-founding50-promo-v1",
  ));

console.log(
  JSON.stringify(
    { assessmentPriceIds: prices, foundingPromotionId: promotion.id },
    null,
    2,
  ),
);
