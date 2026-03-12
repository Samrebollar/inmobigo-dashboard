import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InmobiGo | Portal Corporativo",
  description:
    "Plataforma inteligente para la administración de condominios y automatización de cobranza",
  icons: {
    icon: "/icon.png?v=4",
    apple: "/icon.png?v=4",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
      </head>

      <body
        translate="no"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
