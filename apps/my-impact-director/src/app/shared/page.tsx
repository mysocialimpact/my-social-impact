import { SharedPublication } from "@/components/shared-publication";
export const metadata = {
  title: "Shared digital report",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function Shared() {
  return <SharedPublication />;
}
