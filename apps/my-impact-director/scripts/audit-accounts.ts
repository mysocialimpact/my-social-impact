import { auditAccounts, archiveKnownTest } from "../src/lib/account-cleanup";
import { query, database } from "../src/lib/db";
const apply = process.argv.includes("--apply");
const name = new URL(process.env.DATABASE_URL!).pathname;
if (!["/my_impact_director_validation", "/my_impact_director"].includes(name))
  throw new Error("Refusing an unexpected database.");
const accounts = await auditAccounts();
for (const u of accounts) {
  console.log(
    JSON.stringify({
      id: u.id,
      classification: u.classification,
      reason: u.reason,
      reports: u.reports,
      payments: u.payments,
      enquiries: u.enquiries,
      alreadyArchived: !!u.retired_at,
      proposedArchive: u.retire && !u.retired_at,
    }),
  );
  if (apply) {
    await query(
      "UPDATE director.users SET account_class=$2,classification_reason=$3 WHERE id=$1 AND account_class='unclassified'",
      [u.id, u.classification, u.reason],
    );
    if (u.retire)
      await archiveKnownTest(u.id, "system:authorised-test-cleanup");
  }
}
console.log(
  apply
    ? "Reversible archive applied. Historical report and payment records retained."
    : "Audit only. Add --apply after reviewing the targets.",
);
await database().end();
