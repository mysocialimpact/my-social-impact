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
import "./account.css";
import { ActionShell } from "@/components/action-bar";
import { Header, Footer } from "@/components/shell";
export const metadata: Metadata = {
  metadataBase: new URL("https://www.myimpactdirector.com"),
  title: {
    default: "My Impact Director — Expert impact management. For everyone.",
    template: "%s | My Impact Director",
  },
  description:
    "Making expert impact management affordable for every organisation. Your own Impact Director, with human expertise and powerful AI. Start with a free impact report review. No registration required.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <ActionShell>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </ActionShell>
      </body>
    </html>
  );
}
