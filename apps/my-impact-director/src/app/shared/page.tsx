import { SharedReview } from "@/components/shared-review";
export const metadata = {
  title: "Shared assessment",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function Shared() {
  return (
    <section className="section">
      <SharedReview />
    </section>
  );
}
