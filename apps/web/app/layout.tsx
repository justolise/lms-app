import type { Metadata } from "next";
import { Lora, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ComonPlace — Knowledge. Community. Opportunity.",
    template: "%s | ComonPlace",
  },
  description:
    "ComonPlace is a shared digital home for schools, educational institutions, and community libraries in Kenya and East Africa.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      {
        url: "/brand/favicon/favicon-16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/brand/favicon/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/brand/favicon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "icon",
        url: "/brand/favicon/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "icon",
        url: "/brand/favicon/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
};

// Inline script to prevent theme flash (FOUC)
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('lms-theme-preference');
    var isDark = stored === 'dark' || ((!stored || stored === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${lora.variable} h-full antialiased`}
    >
      <head>
        <script>{themeScript}</script>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
