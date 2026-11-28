import type { Metadata } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-sans/800.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/400-italic.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import "./campaign.css";
import "./creative-home.css";
import "./account-journey.css";
import "./review-learning.css";
import "./contributions.css";
import "./publication.css";
import "./signin-founder.css";
import { ActionShell } from "@/components/action-bar";
import { Header, Footer } from "@/components/shell";
import { WorkspaceTracker } from "@/components/workspace-tracker";
export const metadata: Metadata = {
  metadataBase: new URL("https://www.myimpactdirector.com"),
  title: {
    default: "My Impact Director — Expert impact management. For everyone.",
    template: "%s | My Impact Director",
  },
  description:
    "We’re building an AI-powered Impact Director with experienced human professionals. Its first job is ready: review your impact report for free. Professional report services and ongoing human-led support are available now.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <ActionShell>
          <Header />
          <div className="global-workspace report-workspace">
            <WorkspaceTracker />
          </div>
          <main id="main">{children}</main>
          <Footer />
        </ActionShell>
      </body>
    </html>
  );
}
