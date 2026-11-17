export function contributionPence(value: unknown, maximum = 100000): number {
  if (
    typeof value !== "string" ||
    !/^\d{1,5}(?:\.\d{1,2})?$/.test(value.trim())
  )
    throw new Error(
      "Enter an amount in pounds, with up to two decimal places.",
    );
  const [pounds, decimals = ""] = value.trim().split(".");
  const pence = Number(pounds) * 100 + Number(decimals.padEnd(2, "0"));
  if (pence < 100 || pence > maximum)
    throw new Error(
      `Choose between £1 and £${(maximum / 100).toLocaleString("en-GB")} for a one-off contribution.`,
    );
  return pence;
}
