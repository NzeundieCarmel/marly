import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { EnregistrerServiceWorker } from "./service-worker";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Marly",
  description: "Comptabilité connectée",
};

export const viewport: Viewport = {
  themeColor: "#10294A",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={dmSans.className}>
        {children}
        <EnregistrerServiceWorker />
      </body>
    </html>
  );
}