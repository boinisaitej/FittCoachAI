import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PwaInstallPrompt } from "@/components/pwa-install";
import { env } from "@/lib/env";
import "./globals.css";

// System font stack — avoids Google Fonts (blocked by some corporate proxies).
const inter = { variable: "" };

export const metadata: Metadata = {
  title: { default: env.NEXT_PUBLIC_APP_NAME, template: `%s — ${env.NEXT_PUBLIC_APP_NAME}` },
  description: "AI-powered SaaS for gyms, trainers, and clients.",
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: env.NEXT_PUBLIC_APP_NAME,
    description: "AI-powered gym SaaS.",
    type: "website",
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#22c55e" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" theme="system" closeButton />
          <PwaInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
