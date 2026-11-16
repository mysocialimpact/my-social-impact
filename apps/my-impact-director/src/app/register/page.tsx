import { AccountPage } from "@/components/account";
export const metadata = {
  title: "Create your free account",
  robots: { index: false, follow: false },
};
export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return <AccountPage mode="signup" next={(await searchParams).next} />;
}
