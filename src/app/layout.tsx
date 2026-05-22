import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { AuthProvider } from "@/context/AuthContext";
import ChatWidgetLazy from "@/components/chat/ChatWidgetLazy";
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
    <ClerkProvider
      localization={esES}
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/auth/redirect"
      signUpFallbackRedirectUrl="/auth/redirect"
    >
      <html lang="es" className={`${geist.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-gray-50">
          <AuthProvider>
            {children}
            <ChatWidgetLazy />
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
