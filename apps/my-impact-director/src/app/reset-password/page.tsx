import { PasswordRecovery } from "@/components/password-recovery";
export const metadata = { title: "Choose a new password" };
export default function ResetPassword() {
  return (
    <section className="section auth-page">
      <PasswordRecovery reset />
    </section>
  );
}
