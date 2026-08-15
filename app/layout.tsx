import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
