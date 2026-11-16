import Link from "next/link";
import { EDIT_ATTRIBUTION, editCaveat } from "@/lib/branding";
export function CreativeCaveat({ version }: { version?: string }) {
  return (
    <div
      role="note"
      className="creative-caveat"
      aria-label="Creative assessment limitations"
    >
      <p className="eyebrow">Indicative Creative Assessment</p>
      <p>{editCaveat(version)}</p>
      <p className="creative-attribution">{EDIT_ATTRIBUTION}</p>
      <Link href="/services/expert-review">
        Explore a professional human creative review →
      </Link>
    </div>
  );
}
