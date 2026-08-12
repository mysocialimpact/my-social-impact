import type { Metadata } from "next";
import { DM_Sans, Lora } from "next/font/google";
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

const canonicalOrigin = "https://mysocialimpact.org";
const socialImage = `${canonicalOrigin}/og.png?v=20260811`;

export const metadata: Metadata = {
  metadataBase: new URL(canonicalOrigin),
  title: {
    default: "My Social Impact | Strategy for Social Impact Excellence",
    template: "%s | My Social Impact",
  },
  description:
    "We help organisations create more social impact, understand it deeply, prove it credibly and communicate it with confidence.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "My Social Impact",
    description: "Imagine a world where social impact was taken as seriously as financial performance.",
    type: "website",
    url: canonicalOrigin,
    siteName: "My Social Impact",
    locale: "en_GB",
    images: [{ url: socialImage, width: 1730, height: 909, type: "image/png", alt: "My Social Impact: Imagine a world where social impact was taken as seriously as financial performance. Strategy for Social Impact Excellence." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "My Social Impact",
    description: "Imagine a world where social impact was taken as seriously as financial performance.",
    images: [socialImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
