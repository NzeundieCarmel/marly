import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import Script from "next/script";
import { EnregistrerServiceWorker } from "./service-worker";
import "./globals.css";

// Lit le thème choisi avant l'affichage : pas de flash clair puis sombre
const SCRIPT_THEME = `try{var t=localStorage.getItem("marly-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

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
    <html lang="fr" suppressHydrationWarning>
      <body className={dmSans.className}>
        <Script id="theme-marly" strategy="beforeInteractive">
          {SCRIPT_THEME}
        </Script>
        {children}
        <EnregistrerServiceWorker />
      </body>
    </html>
  );
}