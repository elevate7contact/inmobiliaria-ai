/**
 * /reset-password — placeholder. La lógica real (envío de email con magic link
 * o token de reset) requiere servicio SMTP que se decide en Sprint 5+ junto
 * con Stripe + emails transaccionales. Por ahora muestra mensaje informativo.
 */
import Link from 'next/link';

export default function ResetPasswordPage() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Restablecer contraseña</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
        El flujo de recuperación por email se habilita junto con el sistema de notificaciones
        del Sprint 5. Mientras tanto, contactá soporte directo:{' '}
        <a href="mailto:soporte@inmobiliaria-ai.com" className="text-blue-600 hover:underline">
          soporte@inmobiliaria-ai.com
        </a>
      </p>
      <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">
        ← Volver a iniciar sesión
      </Link>
    </div>
  );
}
