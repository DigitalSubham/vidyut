import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, Noto_Sans_Devanagari } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { TokenRefresher } from "@/components/token-refresher";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
});

export const metadata: Metadata = {
  title: "Vidyut",
  description: "The energy that powers your school.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${inter.variable} ${notoSansDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider>
          <QueryProvider>
            <TokenRefresher />
            {children}
            {/*
             * Was never mounted anywhere in the app — every toast.success()/
             * toast.error() call across the whole codebase (including the
             * new global error handler in query-provider.tsx) has been
             * silently doing nothing until this line existed.
             */}
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
