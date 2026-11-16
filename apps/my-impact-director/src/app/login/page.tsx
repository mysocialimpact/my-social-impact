import { Account } from "@/components/account";
export const metadata = { title: "Log in — My Reports" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const q = await searchParams;
  return (
    <section className="section auth-page">
      <Account
        next={q.next}
        initialMode={q.mode === "signup" ? "signup" : "login"}
      />
    </section>
  );
}
