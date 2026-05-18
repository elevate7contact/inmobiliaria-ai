"use client";

// src/app/(adminApp)/admin/realtors/[id]/verify/VerifyActions.tsx
// Botones Aprobar / Rechazar.

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  realtorId: string;
  currentStatus: string;
};

export default function VerifyActions({ realtorId, currentStatus }: Props) {
  const router = useRouter();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "approve" | "reject") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/realtors/${realtorId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: action === "reject" ? reason.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      router.push("/admin/realtors");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-white">Decisión</h2>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {!showReject ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => submit("approve")}
            disabled={loading !== null || currentStatus === "VERIFIED"}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg transition disabled:opacity-50"
          >
            {loading === "approve" ? "Aprobando..." : "Aprobar"}
          </button>
          <button
            type="button"
            onClick={() => setShowReject(true)}
            disabled={loading !== null}
            className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-sm rounded-lg transition disabled:opacity-50"
          >
            Rechazar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-400">
            Motivo del rechazo (lo verá la inmobiliaria)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full rounded-md bg-gray-800 border border-gray-700 text-white text-sm p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ej: La cédula no se ve clara, vuelve a subirla con mejor calidad."
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submit("reject")}
              disabled={loading !== null || !reason.trim()}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-sm rounded-lg transition disabled:opacity-50"
            >
              {loading === "reject" ? "Rechazando..." : "Confirmar rechazo"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReject(false);
                setReason("");
              }}
              disabled={loading !== null}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
