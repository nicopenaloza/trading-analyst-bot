import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trading Bot Dashboard",
  description: "BYMA & CEDEARs — Autonomous trading signals",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#080c14] text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
