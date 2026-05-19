// src/components/OnboardingBanner.tsx
// Banner compacto para el dashboard del realtor cuando el onboarding no está al 100%.

"use client";

import Link from "next/link";

const ATHORA_ORANGE = "#FF6B1A";

export default function OnboardingBanner({
  percentComplete,
  missingSteps,
}: {
  percentComplete: number;
  missingSteps: string[];
}) {
  if (percentComplete >= 100 || missingSteps.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 shadow-sm"
      style={{
        borderColor: "#FFD9C2",
        backgroundColor: "#FFF4ED",
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold text-white"
            style={{ backgroundColor: ATHORA_ORANGE }}
          >
            {percentComplete}%
          </span>
          <h3 className="text-sm font-semibold text-gray-900">
            Tu cuenta está al {percentComplete}% — te faltan {missingSteps.length}{" "}
            paso{missingSteps.length === 1 ? "" : "s"} para activar publicaciones
          </h3>
        </div>
        <p className="mt-1 text-sm text-gray-700">
          Pendiente: {missingSteps.join(" · ")}
        </p>
      </div>

      <Link
        href="/onboarding"
        className="inline-flex shrink-0 items-center rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        style={{ backgroundColor: ATHORA_ORANGE }}
      >
        Ver checklist →
      </Link>
    </div>
  );
}
