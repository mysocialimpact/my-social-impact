import { AccountPage } from "@/components/account";
export const metadata = {
  title: "Recover your password",
  robots: { index: false, follow: false },
};
export default function Forgot() {
  return <AccountPage mode="forgot" />;
}
