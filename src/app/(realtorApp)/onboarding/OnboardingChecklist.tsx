// src/app/(realtorApp)/onboarding/OnboardingChecklist.tsx
"use client";

import Link from "next/link";

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  ctaLabel: string;
  ctaHref: string;
};

const ATHORA_ORANGE = "#FF6B1A";

export default function OnboardingChecklist({
  steps,
  progress,
  completedCount,
  companyName,
}: {
  steps: OnboardingStep[];
  progress: number;
  completedCount: number;
  companyName: string | null;
}) {
  const allDone = completedCount === steps.length;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Onboarding
        </p>
        <h1 className="text-3xl font-bold text-gray-900">
          Activá tu cuenta de inmobiliaria
        </h1>
        <p className="text-gray-600">
          {companyName ? (
            <>
              Hola, <strong>{companyName}</strong>. Mira, tu cuenta está al{" "}
              <strong>{progress}%</strong>. Completá los pasos de abajo y vas a
              poder publicar propiedades sin fricción.
            </>
          ) : (
            <>
              Mira, tu cuenta está al <strong>{progress}%</strong>. Completá los
              pasos de abajo para empezar a publicar.
            </>
          )}
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              {completedCount} de {steps.length} pasos completados
            </span>
            <span className="font-semibold" style={{ color: ATHORA_ORANGE }}>
              {progress}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: ATHORA_ORANGE,
              }}
            />
          </div>
        </div>
      </header>

      <ol className="space-y-4">
        {steps.map((step, idx) => (
          <li
            key={step.id}
            className={`rounded-2xl border p-5 shadow-sm transition ${
              step.completed
                ? "border-green-200 bg-green-50/40"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex flex-wrap items-start gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  step.completed
                    ? "bg-green-500 text-white"
                    : "border-2 border-gray-300 bg-white text-gray-500"
                }`}
                aria-hidden
              >
                {step.completed ? "✓" : idx + 1}
              </div>

              <div className="min-w-0 flex-1">
                <h3
                  className={`text-base font-semibold ${
                    step.completed ? "text-gray-700" : "text-gray-900"
                  }`}
                >
                  {step.title}
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    step.completed
                      ? "text-gray-500 line-through decoration-gray-300"
                      : "text-gray-600"
                  }`}
                >
                  {step.description}
                </p>
              </div>

              <Link
                href={step.ctaHref}
                className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                  step.completed
                    ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    : "text-white hover:opacity-90"
                }`}
                style={
                  step.completed
                    ? undefined
                    : { backgroundColor: ATHORA_ORANGE }
                }
              >
                {step.ctaLabel} →
              </Link>
            </div>
          </li>
        ))}
      </ol>

      {allDone && (
        <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-6 text-center shadow-sm">
          <p className="text-2xl">🎉</p>
          <h2 className="mt-2 text-xl font-bold text-gray-900">
            ¡Listo! Tu cuenta está 100% activa
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ya completaste todos los pasos. Ahora podés enfocarte en publicar y
            cerrar ventas.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Ir al dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
