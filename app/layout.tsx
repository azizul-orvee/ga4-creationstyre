import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

// The same pairing the main site uses: Space Grotesk for headings and figures,
// Inter for everything else. Self-hosted by next/font, so no request to Google.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });

export const metadata: Metadata = {
  title: "Enquiries & Ad Spend",
  description: "Phone and form enquiries against Google Ads spend, by campaign",
  // Lets the client save the dashboard to their home screen and have it open
  // like an app rather than a browser tab.
  appleWebApp: { capable: true, title: "Enquiries", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Fills the notch area on phones instead of leaving black bars.
  viewportFit: "cover",
  // One value rather than a pair keyed to the device preference: the dashboard
  // is always in the light brand theme, whatever the phone is set to.
  themeColor: "#f5f7f9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`h-full antialiased ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
