import { AccountSettings } from "@/components/account-settings";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default function Account() {
  return (
    <section className="section">
      <AccountSettings />
    </section>
  );
}
