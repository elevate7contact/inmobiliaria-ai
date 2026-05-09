"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Email inválido"),
});

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = schema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password` }
    );

    setLoading(false);
    if (supabaseError) {
      setError("Error al enviar el email. Intenta de nuevo.");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Revisa tu email
        </h2>
        <p className="text-gray-500 text-sm">
          Enviamos un link para restablecer tu contraseña a{" "}
          <span className="font-medium text-gray-700">{email}</span>
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-indigo-600 text-sm hover:underline"
        >
          ← Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">
        Restablecer contraseña
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Ingresa tu email y te enviaremos un link para restablecer tu contraseña.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition disabled:opacity-60 text-sm"
        >
          {loading ? "Enviando..." : "Enviar link"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        <Link href="/login" className="text-indigo-600 hover:underline">
          ← Volver al inicio de sesión
        </Link>
      </p>
    </>
  );
}
