import type { Metadata } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "./register-sw";

export const metadata: Metadata = {
  title: "Vidyut",
  description: "Your school's public page and online admission form.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
