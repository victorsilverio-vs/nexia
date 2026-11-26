import type { Metadata, Viewport } from "next";
import "@fontsource-variable/red-hat-display";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NEXIA", template: "%s · NEXIA" },
  description: "Assessoria em desenvolvimento imobiliário do Ecossistema VS.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
