import { AccessLink } from "@/components/access-link";
export const metadata = {
  title: "Open your saved review",
  robots: { index: false, follow: false },
};
export default function Access() {
  return (
    <section className="section narrow">
      <h1 className="access-title">
        Your impact insight.
        <br />
        <em>Ready when you are.</em>
      </h1>
      <AccessLink />
    </section>
  );
}
