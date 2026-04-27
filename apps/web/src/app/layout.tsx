import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { ErrorBoundary } from "@/components/error-boundary";
import { AnalyticsTracker } from "@/components/analytics";
import ServiceWorkerRegistration from "@/components/service-worker";
import { ANALYTICS_CONFIG } from "@/lib/analytics";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AIVO - AI-Powered Fitness Platform",
    template: "%s | AIVO"
  },
  description: "High-performance fitness platform with AI-driven body analysis, smart scheduling, and real-time tracking. Transform your fitness journey with Cloudflare edge computing.",
  keywords: [
    "fitness",
    "AI fitness",
    "body analysis",
    "workout tracking",
    "health platform",
    "personalized fitness",
    "AI coach",
    "muscle analysis",
    "fitness dashboard",
    "Cloudflare"
  ],
  authors: [{ name: "AIVO Team" }],
  creator: "AIVO",
  publisher: "AIVO",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aivo.fitness",
    siteName: "AIVO",
    title: "AIVO - AI-Powered Fitness Platform",
    description: "AI-driven fitness intelligence with body composition analysis, smart scheduling, and real-time tracking.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AIVO Fitness Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@aivo_fitness",
    creator: "@aivo_fitness",
    title: "AIVO - AI-Powered Fitness Platform",
    description: "AI-driven fitness intelligence with body composition analysis, smart scheduling, and real-time tracking.",
    images: ["/og-image.png"],
  },
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
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192x192.png",
    shortcut: "/icons/icon-72x72.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AIVO",
    startupImage: "/splash.png",
  },
};

// Separate viewport export (Next.js 15+)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
} as const;

// Separate themeColor export (Next.js 15+)
export const themeColor = [
  { media: "(prefers-color-scheme: light)", color: "#06b6d4" },
  { media: "(prefers-color-scheme: dark)", color: "#06b6d4" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.aivo.fitness" />

        {/* DNS prefetch for API */}
        <link rel="dns-prefetch" href="https://api.aivo.fitness" />

        {/* Preload critical resources */}
        <link rel="preload" as="font" href="/fonts/geist.woff2" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" as="font" href="/fonts/inter.woff2" type="font/woff2" crossOrigin="anonymous" />

        {/* Google Analytics */}
        {process.env.NODE_ENV === "production" && ANALYTICS_CONFIG.enabled && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.googleAnalyticsId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${ANALYTICS_CONFIG.googleAnalyticsId}', {
                    page_title: document.title,
                    page_location: window.location.href,
                    anonymize_ip: true,
                    allow_ad_personalization_signals: false,
                  });
                `,
              }}
            />
          </>
        )}

        {/* Structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "AIVO",
              "description": "AI-powered fitness intelligence platform",
              "url": "https://aivo.fitness",
              "applicationCategory": "HealthAndFitnessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
              },
              "author": {
                "@type": "Organization",
                "name": "AIVO",
              },
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
            <LocaleProvider>
              <AuthProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="dark"
                  forcedTheme="dark"
                  disableTransitionOnChange
                >
                  <AnalyticsTracker />
                  <ServiceWorkerRegistration />
                  {children}
                  <Toaster richColors />
                </ThemeProvider>
              </AuthProvider>
            </LocaleProvider>
          </GoogleOAuthProvider>
        </ErrorBoundary>
        {/* Initialize Web Vitals monitoring */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                // Load web-vitals library
                import('web-vitals').then(({ onCLS, onFCP, onFID, onLCP, onTTFB }) => {
                  const reportWebVital = (metric) => {
                    const { name, value, delta } = metric;
                    const rating = value <= 2500 && name === 'LCP' ? 'good' :
                                  value <= 100 && name === 'FID' ? 'good' :
                                  value <= 0.1 && name === 'CLS' ? 'good' :
                                  value <= 4000 && name === 'LCP' ? 'needs-improvement' :
                                  value <= 300 && name === 'FID' ? 'needs-improvement' :
                                  value <= 0.25 && name === 'CLS' ? 'needs-improvement' : 'poor';

                    if (window.gtag) {
                      window.gtag('event', 'web_vital', {
                        event_category: 'Web Vitals',
                        event_label: name,
                        value: Math.round(value),
                        metric_rating: rating,
                        metric_name: name
                      });
                    }

                    if (${process.env.NODE_ENV === 'development'}) {
                      console.log(\`[Web Vitals] \${name}:\`, {
                        value: name === 'CLS' ? value.toFixed(3) : Math.round(value) + 'ms',
                        rating,
                        delta
                      });
                    }
                  };

                  onCLS(reportWebVital);
                  onFCP(reportWebVital);
                  onFID(reportWebVital);
                  onLCP(reportWebVital);
                  onTTFB(reportWebVital);
                }).catch(console.warn);
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
