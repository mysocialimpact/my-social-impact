import { AccountOverview } from "@/components/account-overview";
import { AccountUpgradeList } from "@/components/intelligence-offers";

export const metadata = { title: "Your account" };
export default function AccountPage() {
  return <AccountOverview upgrades={<AccountUpgradeList />} />;
}
