import type { Metadata } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import { Header, Footer } from "@/components/shell";
export const metadata: Metadata = {
  metadataBase: new URL("https://www.myimpactdirector.com"),
  title: {
    default: "My Impact Director — How good is your impact report?",
    template: "%s | My Impact Director",
  },
  description:
    "A free, evidence-grounded review of your impact report, using the Social Impact Claims Code and Social Impact Excellence frameworks. Developed by My Social Impact.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
