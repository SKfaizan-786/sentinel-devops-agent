
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalShortcuts } from "@/components/common/GlobalShortcuts";
import { ToastContainer } from "../components/notifications/Toast";
import { WebSocketProvider } from "@/lib/WebSocketContext";
import { STORAGE_KEY } from "@/hooks/useTheme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sentinel - AI DevOps Intelligence Agent",
    template: "%s | Sentinel",
  },
  description: "Autonomous AI agent that monitors your infrastructure 24/7, predicts failures, and automatically heals incidents. Your AI-powered DevOps engineer that never sleeps.",
  keywords: ["DevOps", "AI", "Monitoring", "Self-healing", "Incident Management", "Automation", "SRE", "Infrastructure"],
  authors: [{ name: "Sentinel Team" }],
  creator: "Sentinel",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sentinel-devops.vercel.app",
    siteName: "Sentinel",
    title: "Sentinel - AI DevOps Intelligence Agent",
    description: "Autonomous monitoring. Predictive healing. Always awake. Meet your AI DevOps Engineer.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sentinel Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentinel - AI DevOps Intelligence Agent",
    description: "Autonomous monitoring. Predictive healing. Always awake.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('${STORAGE_KEY}');
                  var theme = (stored === 'dark' || stored === 'light')
                    ? stored
                    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  if (theme === 'light') {
                    document.documentElement.classList.add('light');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalShortcuts />
        <ToastContainer />
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </body>
    </html>
  );
}