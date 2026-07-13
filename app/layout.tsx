import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Kantumruy_Pro, Moul, Siemreap } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const kantumruy = Kantumruy_Pro({
  subsets: ["khmer"],
  variable: "--font-kantumruy",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const moul = Moul({
  subsets: ["khmer"],
  variable: "--font-moul",
  display: "swap",
  weight: ["400"],
});

const siemreap = Siemreap({
  subsets: ["khmer"],
  variable: "--font-siemreap",
  display: "swap",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង — ប្រព័ន្ធគ្រប់គ្រងសាលារៀន",
  description: "Advanced School Management System for Hun Sen Pothi Rieng High School",
  manifest: "/manifest.json",
  icons: {
    icon: "/assets/favicon.png",
    apple: "/assets/brand-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "សាលារៀន GEIP",
  },
};

export const viewport: Viewport = {
  themeColor: "#155EEF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km" className={`h-full antialiased ${plusJakarta.variable} ${kantumruy.variable} ${moul.variable} ${siemreap.variable}`}>
      <body className="min-h-full flex flex-col bg-white text-slate-800 font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
