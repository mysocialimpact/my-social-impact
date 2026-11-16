import { ReviewView } from "@/components/review-view";
export default async function Review({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <section className="section">
      <ReviewView id={(await params).id} />
    </section>
  );
}
