import { Admin } from "@/components/admin";
import { PageIntro } from "@/components/shell";
export const metadata = {
  robots: { index: false, follow: false },
  title: "Founder control centre",
};
export default function AdminPage() {
  return (
    <section className="section">
      <PageIntro label="Founder control centre" title="The useful overview." />
      <Admin />
    </section>
  );
}
