"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase sets the session from the URL hash when the user arrives via the email link.
  // We wait for the AUTH_TOKEN_REFRESHED / PASSWORD_RECOVERY event before showing the form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setReady(true);
        }
      }
    );

    // Also check if already has a valid session (e.g. page reload)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = schema.safeParse({ password, confirm });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { error: supabaseError } = await supabase.auth.updateUser({
      password: result.data.password,
    });
    setLoading(false);

    if (supabaseError) {
      setError("Error al actualizar la contraseña. El link puede haber expirado.");
      return;
    }

    setDone(true);
    // Redirigir al login después de 3 segundos
    setTimeout(() => router.push("/login"), 3000);
  };

  if (done) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Contraseña actualizada
        </h2>
        <p className="text-gray-500 text-sm">
          Tu contraseña fue cambiada correctamente. Redirigiendo al inicio de sesión...
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin text-3xl mb-3">⏳</div>
        <p className="text-gray-500 text-sm">Verificando enlace...</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">
        Nueva contraseña
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Elegí una contraseña segura de al menos 8 caracteres.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar contraseña
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repetí la contraseña"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition disabled:opacity-60 text-sm"
        >
          {loading ? "Guardando..." : "Guardar contraseña"}
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
