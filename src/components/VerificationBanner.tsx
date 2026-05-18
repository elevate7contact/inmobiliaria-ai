// src/components/VerificationBanner.tsx
// Banner según verificationStatus del realtor.

import Link from "next/link";

type Props = {
  status: string;
  rejectionReason?: string | null;
};

export default function VerificationBanner({ status, rejectionReason }: Props) {
  if (status === "VERIFIED") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-medium text-green-800">
        Inmobiliaria verificada ✓
      </div>
    );
  }

  if (status === "UNDER_REVIEW") {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <h3 className="text-sm font-semibold text-blue-900">
          Estamos revisando tus documentos
        </h3>
        <p className="mt-1 text-sm text-blue-800">
          Te avisamos por correo en 24–48 horas. Mientras tanto puedes terminar
          de armar tu perfil.
        </p>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <h3 className="text-sm font-semibold text-red-900">
          Tus documentos fueron rechazados
        </h3>
        {rejectionReason && (
          <p className="mt-1 text-sm text-red-800 whitespace-pre-wrap">
            Motivo: {rejectionReason}
          </p>
        )}
        <Link
          href="/dashboard/verification"
          className="mt-3 inline-block rounded-md bg-red-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Subir documentos de nuevo
        </Link>
      </div>
    );
  }

  // PENDING (default)
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h3 className="text-sm font-semibold text-amber-900">
        Tu cuenta está sin verificar
      </h3>
      <p className="mt-1 text-sm text-amber-800">
        Sube los 4 documentos para empezar a publicar propiedades.
      </p>
      <Link
        href="/dashboard/verification"
        className="mt-3 inline-block rounded-md bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
      >
        Ir a verificación
      </Link>
    </div>
  );
}
