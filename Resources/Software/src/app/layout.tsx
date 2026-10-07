import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UTM Lab — Suite Metrológica de Ensayos Mecánicos",
  description: "Adquisición en tiempo real, trazabilidad serial v1 y caracterización de probetas poliméricas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-lab-bg text-lab-text antialiased selection:bg-laser selection:text-white font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
