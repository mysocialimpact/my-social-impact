import Link from "next/link";
import { SorpReadinessConversation } from "./sorp-readiness-conversation";

export function SorpConversationWorkspace() {
  return <main className="sorp-conversation-page">
    <header className="sorp-workspace-brand">
      <Link href="/are-you-sorp-ready"><span>My Social Impact</span><strong>Are You SORP Ready?</strong></Link>
      <div className="sorp-workspace-brand-meta">
        <p><span className="sorp-workspace-brand-desktop">Free SORP 2026 readiness check</span><span className="sorp-workspace-brand-mobile">Free</span></p>
        <small>SORP is the requirement. Better impact is the opportunity.</small>
      </div>
    </header>
    <SorpReadinessConversation />
  </main>;
}
