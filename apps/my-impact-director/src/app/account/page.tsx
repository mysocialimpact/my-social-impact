import { AccountSettings } from "@/components/account-settings";
export const metadata = { title: "Account" };
export default function AccountPage() {
  return (
    <section className="section auth-page">
      <AccountSettings />
    </section>
  );
}
