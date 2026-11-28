import Link from "next/link";
import { AccountSettings } from "@/components/account-settings";
export const metadata = { title: "Account settings" };
export default function SecurityPage() {
  return (
    <section className="account-security-page">
      <Link href="/account" className="account-text-link">
        Back to your account
      </Link>
      <AccountSettings />
    </section>
  );
}
