import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inmobiliaria AI — Búsqueda Inteligente de Inmuebles",
  description:
    "Encuentra tu inmueble ideal con inteligencia artificial. Búsqueda en Colombia, USA, México, Argentina y Chile.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
