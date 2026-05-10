/**
 * RootLayout — único archivo compartido entre Sprint 2 (yo) y Sprint 3+ (compañero).
 *
 * Responsabilidades:
 * 1. Cargar Google Fonts (Geist) — configuración default de Next.js 16.
 * 2. Hidratar el AuthProvider con la sesión actual (server → client bridge).
 * 3. Renderizar el navbar base que reacciona al rol del user.
 * 4. Children = el route group correspondiente: (auth), (realtorApp), (searcherApp).
 *
 * Nota para mi compañero: si necesitás agregar providers globales (theme,
 * toaster, etc.) ponelos DENTRO del AuthProvider, no afuera. Y hablamos antes.
 */
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { AuthProvider, type AuthUser } from '@/context/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Inmobiliaria AI',
  description: 'Plataforma global de propiedades en arriendo con búsqueda inteligente.',
};

/**
 * Lee la sesión y, si existe, hidrata el user desde Prisma.
 * Devuelve null si no hay sesión o si el user fue eliminado pero la cookie sobrevive.
 */
async function loadCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;
  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true },
    });
    return user;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await loadCurrentUser();

  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <AuthProvider user={user}>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
