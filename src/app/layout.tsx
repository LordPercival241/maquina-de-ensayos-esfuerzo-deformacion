import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UTM · Ensayos de fuerza",
  description: "Adquisición trazable de ensayos de fuerza y deformación."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
