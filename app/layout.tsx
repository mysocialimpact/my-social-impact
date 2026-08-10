import type { Metadata } from "next";
import { DM_Sans, Lora } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const serif = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "mysocialimpact.org";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  const socialImage = `${origin}/og.png`;

  return {
    metadataBase: new URL(origin),
    title: {
      default: "My Social Impact | Strategy for Social Impact Excellence",
      template: "%s | My Social Impact",
    },
    description:
      "We help organisations create more social impact, understand it deeply, prove it credibly and communicate it with confidence.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "My Social Impact",
      description: "Strategy for Social Impact Excellence",
      type: "website",
      url: origin,
      images: [{ url: socialImage, width: 1730, height: 909, alt: "My Social Impact — Strategy for Social Impact Excellence" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "My Social Impact",
      description: "Strategy for Social Impact Excellence",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
