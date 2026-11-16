import { AccountPage } from "@/components/account";
export const metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return <AccountPage mode="login" next={(await searchParams).next} />;
}
