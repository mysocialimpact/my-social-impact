import { VerifyEmail } from "@/components/verify-email";
export const metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};
export default async function Verify({
  searchParams,
}: {
  searchParams: Promise<{ resend?: string }>;
}) {
  return (
    <section className="section">
      <VerifyEmail notSent={(await searchParams).resend === "1"} />
    </section>
  );
}
