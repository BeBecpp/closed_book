import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { SITE } from "@/src/lib/site/config";
import "./globals.css";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "CLOSED BOOK — Pass the test. Keep the test closed.",
    template: "%s — CLOSED BOOK",
  },
  description: SITE.description,
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "CLOSED BOOK",
    description: "Prove the verdict. Keep the evidence private.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#F1EEE6",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh overflow-x-hidden">
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
