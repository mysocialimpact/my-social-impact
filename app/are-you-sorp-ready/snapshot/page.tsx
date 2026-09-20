import type { Metadata } from "next";
import { SorpWorkspace } from "../../sorp-workspace";
import "../../sorp-ready.css";

export const metadata: Metadata = {
  title: "SORP Ready Snapshot",
  description: "Complete the free My Social Impact SORP 2026 readiness snapshot, focused on narrative and impact reporting.",
};

export default function Page() {
  return <SorpWorkspace view="snapshot" />;
}
