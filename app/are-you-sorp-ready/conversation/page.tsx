import type { Metadata } from "next";
import { SorpConversationWorkspace } from "../../sorp-conversation-workspace";
import "../../sorp-ready.css";

export const metadata: Metadata = {
  title: "SORP Readiness Conversation",
  description: "Talk to My Social Impact Intelligence, ask SORP 2026 questions and receive a free impact-readiness report.",
};

export default function Page() {
  return <SorpConversationWorkspace />;
}
