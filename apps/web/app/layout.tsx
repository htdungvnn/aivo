import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aivo.app"),
  title: "AIVO — AI Fitness & Nutrition Coach",
  description:
    "Personalized workouts, smarter nutrition, and AI-powered fitness insights designed around your goals.",
  applicationName: "AIVO",
  keywords: [
    "AI fitness coach",
    "AI workout planner",
    "nutrition tracker",
    "workout tracker",
    "fitness app",
    "AI nutrition coach",
  ],
  openGraph: {
    title: "AIVO — AI Fitness & Nutrition Coach",
    description:
      "Personalized workouts, smarter nutrition, and AI-powered fitness insights designed around your goals.",
    type: "website",
    siteName: "AIVO",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "AIVO — AI Fitness & Nutrition Coach",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIVO — AI Fitness & Nutrition Coach",
    description:
      "Personalized workouts, smarter nutrition, and AI-powered fitness insights designed around your goals.",
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-ink text-text antialiased">{children}</body>
    </html>
  );
}
