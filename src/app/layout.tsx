import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/ui/BottomNav";
import ToastContainer from "@/components/ui/Toast";
import Confetti from "@/components/ui/Confetti";
import ThemeProvider from "@/components/ui/ThemeProvider";
import AuthProvider from "@/components/providers/AuthProvider";
import LanguageProvider from "@/components/providers/LanguageProvider";
import DataProvider from "@/components/providers/DataProvider";
import BibleGateProvider from "@/components/providers/BibleGateProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Focus Garden - Grow Your Life, One Session at a Time",
  description:
    "Track your coding practice, AI learning, fitness, reading, spiritual growth, and baby bonding time with a beautiful garden theme.",
  manifest: "/manifest.json",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌱</text></svg>",
    apple: "/icons/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Focus Garden",
  },
};

export const viewport: Viewport = {
  themeColor: "#22c55e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <DataProvider>
                <BibleGateProvider>
                  {children}
                  <Confetti />
                  <ToastContainer />
                  <BottomNav />
                </BibleGateProvider>
              </DataProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
