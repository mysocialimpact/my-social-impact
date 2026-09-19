import Link from "next/link";
import { SorpAssessment } from "./sorp-assessment";

export function SorpWorkspace({ view }: { view: "snapshot" | "results" }) {
  return (
    <main className={`sorp-workspace-page is-${view}`}>
      <header className="sorp-workspace-brand">
        <Link href="/are-you-sorp-ready"><span>My Social Impact</span><strong>Are You SORP Ready?</strong></Link>
        <p>{view === "results" ? "Your impact-readiness result" : "Free impact-readiness snapshot"}</p>
      </header>
      <SorpAssessment view={view} />
    </main>
  );
}
