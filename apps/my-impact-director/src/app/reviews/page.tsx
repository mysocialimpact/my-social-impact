import { PageIntro } from "@/components/shell";
import { SavedReviews } from "@/components/saved-reviews";
export default function Reviews() {
  return (
    <section className="section">
      <PageIntro label="Your private workspace" title="My Reports." />
      <SavedReviews />
    </section>
  );
}
