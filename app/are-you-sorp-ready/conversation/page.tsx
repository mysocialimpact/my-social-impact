import type { Metadata } from "next";
import { SorpConversationWorkspace } from "../../sorp-conversation-workspace";
import "../../sorp-ready.css";

export const metadata: Metadata = {
  title: "SORP Readiness Conversation",
  description: "Talk through your charity’s SORP 2026 impact readiness with the My Social Impact SORP assistant.",
};

export default function Page() {
  return <SorpConversationWorkspace />;
}
