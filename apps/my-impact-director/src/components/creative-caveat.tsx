import Link from "next/link";
import { EDIT_ATTRIBUTION, EDIT_CAVEAT } from "@/lib/branding";
export function CreativeCaveat() {
  return (
    <aside
      className="creative-caveat"
      aria-label="Creative assessment limitations"
    >
      <p className="eyebrow">Indicative Creative Assessment</p>
      <p>{EDIT_CAVEAT}</p>
      <p className="creative-attribution">{EDIT_ATTRIBUTION}</p>
      <Link href="/services/expert-review">
        Explore a professional human creative review →
      </Link>
    </aside>
  );
}
