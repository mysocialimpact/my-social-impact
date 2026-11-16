import { VerifyEmail } from "@/components/verify-email";
export const metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};
export default function Verify() {
  return (
    <section className="section">
      <VerifyEmail />
    </section>
  );
}
