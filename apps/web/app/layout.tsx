import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aivo.com";
const siteName = "AIVO";
const siteDescription =
  "AI-powered health, fitness, and nutrition coaching platform. Your personal wellness guide available 24/7 with personalized plans, meal tracking, and weekly insights.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} - AI Health Coach`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "AI health coach",
    "fitness tracking",
    "nutrition tracking",
    "meal planning",
    "weight loss",
    "health app",
    "wellness app",
    "diet tracking",
    "workout planner",
    "sleep tracking",
    "habit tracking",
  ],
  authors: [{ name: "AIVO Team" }],
  creator: "AIVO",
  publisher: "AIVO",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: siteName,
    title: `${siteName} - AI Health Coach`,
    description: siteDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${siteName} - AI-powered health coaching`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} - AI Health Coach`,
    description: siteDescription,
    images: ["/og-image.png"],
    creator: "@aivoapp",
  },
  alternates: {
    canonical: siteUrl,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteName,
  },
  appLinks: {
    ios: {
      url: "https://apps.apple.com/app/aivo",
      app_store_id: "123456789",
    },
    android: {
      package: "com.aivo.app",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#080B0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
