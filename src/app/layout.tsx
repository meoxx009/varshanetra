import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/common/theme-provider";
import { I18nProvider } from "@/lib/i18n/context";
import { AuthProvider } from "@/hooks/use-auth";
import { DistrictLocationProvider } from "@/hooks/use-district-location";
import {
  PWARegistration,
  OfflineStatusBanner,
  OfflineQueueBadge,
  PwaInstallPrompt,
} from "@/components/pwa";
import { getAppUrl } from "@/lib/config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: "VarshaNetra - आपदा प्रबंधन | District Disaster Decision Support",
  description:
    "District Disaster Management Decision Support System - AI-assisted Heavy Rainfall Early Warning, Inundation Intelligence and Disaster Response.",
  manifest: "/manifest.json",
  openGraph: {
    title: "VarshaNetra - Flood Early Warning & Intelligence",
    description:
      "District Disaster Management Decision Support System - AI-assisted Heavy Rainfall Early Warning, Inundation Intelligence and Disaster Response.",
    type: "website",
    siteName: "VarshaNetra",
  },
  twitter: {
    card: "summary_large_image",
    title: "VarshaNetra - Flood Early Warning & Intelligence",
    description:
      "District Disaster Management Decision Support System - AI-assisted Heavy Rainfall Early Warning, Inundation Intelligence and Disaster Response.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VarshaNetra",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.variable} ${notoSansDevanagari.variable} min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased`}>
        <I18nProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <AuthProvider>
              <DistrictLocationProvider>
                <PWARegistration />
                <OfflineStatusBanner />
                <OfflineQueueBadge />
                <PwaInstallPrompt />
                {children}
              </DistrictLocationProvider>
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
