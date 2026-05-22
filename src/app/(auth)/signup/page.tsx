"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Step = "form" | "verify";

export default function SignupPage() {
  const { signUp, isLoaded } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "SEARCHER" as "SEARCHER" | "REALTOR",
    companyName: "",
  });
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (form.role === "REALTOR" && !form.companyName.trim()) {
      setError("El nombre de empresa es requerido");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await signUp.create({
        emailAddress: form.email,
        password: form.password,
        firstName: form.name.split(" ")[0] || form.name,
        lastName: form.name.split(" ").slice(1).join(" ") || "",
        unsafeMetadata: {
          role: form.role,
          companyName: form.companyName,
        },
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al crear la cuenta";
      setError(msg.includes("taken") ? "Ya existe una cuenta con ese email" : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        // Mover rol a publicMetadata via API
        await fetch("/api/auth/set-role", { method: "POST" });

        // Crear perfil de realtor si aplica
        if (form.role === "REALTOR" && form.companyName) {
          await fetch("/api/auth/create-realtor-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyName: form.companyName }),
          });
        }

        router.push(form.role === "REALTOR" ? "/onboarding" : "/search");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Código inválido";
      setError(msg.includes("incorrect") ? "Código incorrecto" : msg);
    } finally {
      setLoading(false);
    }
  };

  if (step === "verify") {
    return (
      <>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Verificar email
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Ingresá el código que enviamos a{" "}
          <strong>{form.email}</strong>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código de verificación
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm tracking-widest text-center text-lg"
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition disabled:opacity-60 text-sm"
          >
            {loading ? "Verificando..." : "Verificar"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          <button
            onClick={() => setStep("form")}
            className="text-indigo-600 hover:underline"
          >
            ← Volver
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        Crear cuenta
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de cuenta
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["SEARCHER", "REALTOR"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm((p) => ({ ...p, role: r }))}
                className={`py-2.5 rounded-lg border text-sm font-medium transition ${
                  form.role === r
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                }`}
              >
                {r === "SEARCHER" ? "🔍 Buscador" : "🏢 Inmobiliaria"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Juan Pérez"
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {form.role === "REALTOR" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la empresa
            </label>
            <input
              type="text"
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              placeholder="Inmobiliaria XYZ"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="tu@email.com"
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            minLength={8}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar contraseña
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition disabled:opacity-60 text-sm"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="text-indigo-600 font-medium hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
