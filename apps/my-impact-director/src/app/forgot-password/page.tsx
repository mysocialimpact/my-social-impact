import { PasswordRecovery } from "@/components/password-recovery";
export const metadata = { title: "Reset your password" };
export default function ForgotPassword() {
  return (
    <section className="section auth-page">
      <PasswordRecovery />
    </section>
  );
}
