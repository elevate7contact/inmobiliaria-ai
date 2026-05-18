"use client";
// src/app/(searcherApp)/preferences/PreferencesEditor.tsx
// Editor client-side de UserPreferenceProfile. Auto-guarda con debounce.

import { useCallback, useEffect, useRef, useState } from "react";
import type { UserPreferenceProfile } from "@prisma/client";

type Props = {
  initial: UserPreferenceProfile | null;
  initialCityName: string | null;
};

const CURRENCIES = ["COP", "USD", "MXN", "ARS", "CLP"] as const;
const PROPERTY_TYPES = ["APARTMENT", "HOUSE", "LAND", "OFFICE", "COMMERCIAL"] as const;
const SERVICES = ["pool", "gym", "sauna", "canchas", "parking", "bodega", "elevator", "security", "clubhouse"] as const;
const FEATURES = ["terraza", "balcon", "vista", "exterior", "interior"] as const;

const SERVICE_LABELS: Record<string, string> = {
  pool: "Piscina", gym: "Gimnasio", sauna: "Sauna", canchas: "Canchas",
  parking: "Parqueadero", bodega: "Bodega", elevator: "Ascensor",
  security: "Seguridad", clubhouse: "Salón social",
};
const FEATURE_LABELS: Record<string, string> = {
  terraza: "Terraza", balcon: "Balcón", vista: "Vista",
  exterior: "Exterior", interior: "Interior",
};
const TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Apartamento", HOUSE: "Casa", LAND: "Lote",
  OFFICE: "Oficina", COMMERCIAL: "Comercial",
};

function patchField(field: string, value: unknown) {
  return fetch("/api/user/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, value }),
  });
}

export function PreferencesEditor({ initial, initialCityName }: Props) {
  // Local state mirrors DB
  const [budgetMin, setBudgetMin] = useState<string>(initial?.budgetMin?.toString() ?? "");
  const [budgetMax, setBudgetMax] = useState<string>(initial?.budgetMax?.toString() ?? "");
  const [currency, setCurrency] = useState<string>(initial?.currency ?? "");
  const [cityName, setCityName] = useState<string>(initialCityName ?? "");
  const [neighborhoods, setNeighborhoods] = useState<string[]>(initial?.neighborhoods ?? []);
  const [neighborhoodInput, setNeighborhoodInput] = useState("");
  const [propertyTypes, setPropertyTypes] = useState<string[]>(initial?.propertyTypes ?? []);
  const [minAreaM2, setMinAreaM2] = useState<string>(initial?.minAreaM2?.toString() ?? "");
  const [maxAreaM2, setMaxAreaM2] = useState<string>(initial?.maxAreaM2?.toString() ?? "");
  const [minBedrooms, setMinBedrooms] = useState<string>(initial?.minBedrooms?.toString() ?? "");
  const [minBathrooms, setMinBathrooms] = useState<string>(initial?.minBathrooms?.toString() ?? "");
  const [services, setServices] = useState<string[]>(initial?.services ?? []);
  const [features, setFeatures] = useState<string[]>(initial?.features ?? []);
  const [freeNotes, setFreeNotes] = useState<string>(initial?.freeNotes ?? "");

  const [savingHint, setSavingHint] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Debounce timer por campo
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const scheduleSave = useCallback((field: string, value: unknown, delay = 800) => {
    if (timers.current[field]) clearTimeout(timers.current[field]);
    timers.current[field] = setTimeout(async () => {
      setSavingHint("saving");
      try {
        const r = await patchField(field, value);
        setSavingHint(r.ok ? "saved" : "error");
        setTimeout(() => setSavingHint("idle"), 1500);
      } catch {
        setSavingHint("error");
      }
    }, delay);
  }, []);

  // Limpiar timers en unmount
  useEffect(() => {
    const t = timers.current;
    return () => {
      Object.values(t).forEach(clearTimeout);
    };
  }, []);

  // Helpers numéricos: parse "" → null, número → number
  function parseNum(s: string): number | null {
    if (s.trim() === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function onNumChange(field: string, raw: string, setter: (v: string) => void) {
    setter(raw);
    const parsed = parseNum(raw);
    scheduleSave(field, parsed);
  }

  function toggleArray(field: string, list: string[], setter: (v: string[]) => void, item: string) {
    const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
    setter(next);
    scheduleSave(field, next, 300);
  }

  function addNeighborhood() {
    const v = neighborhoodInput.trim();
    if (!v) return;
    if (neighborhoods.includes(v)) {
      setNeighborhoodInput("");
      return;
    }
    const next = [...neighborhoods, v];
    setNeighborhoods(next);
    setNeighborhoodInput("");
    scheduleSave("neighborhoods", next, 300);
  }

  function removeNeighborhood(n: string) {
    const next = neighborhoods.filter((x) => x !== n);
    setNeighborhoods(next);
    scheduleSave("neighborhoods", next, 300);
  }

  async function handleDeleteAll() {
    setSavingHint("saving");
    try {
      const r = await fetch("/api/user/preferences", { method: "DELETE" });
      if (!r.ok) throw new Error();
      setBudgetMin(""); setBudgetMax(""); setCurrency("");
      setCityName(""); setNeighborhoods([]); setPropertyTypes([]);
      setMinAreaM2(""); setMaxAreaM2(""); setMinBedrooms(""); setMinBathrooms("");
      setServices([]); setFeatures([]); setFreeNotes("");
      setConfirmDelete(false);
      setSavingHint("saved");
      setTimeout(() => setSavingHint("idle"), 1500);
    } catch {
      setSavingHint("error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
        Esto es lo que Vistaagent recuerda de ti. Lo usamos para que no te pregunte lo mismo cada vez.
        Puedes editar lo que quieras o borrarlo todo cuando quieras.
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Tus preferencias</h1>
        <span className="text-xs text-gray-500">
          {savingHint === "saving" && "Guardando…"}
          {savingHint === "saved" && "Guardado"}
          {savingHint === "error" && "Error al guardar"}
        </span>
      </div>

      {/* Presupuesto */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Presupuesto</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs text-gray-600">Mínimo</span>
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => onNumChange("budgetMin", e.target.value, setBudgetMin)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-gray-600">Máximo</span>
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => onNumChange("budgetMax", e.target.value, setBudgetMax)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-gray-600">Moneda</span>
            <select
              value={currency}
              onChange={(e) => {
                const v = e.target.value;
                setCurrency(v);
                scheduleSave("currency", v === "" ? null : v, 0);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            >
              <option value="">—</option>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Ubicación */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Ubicación</h2>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-gray-600">Ciudad</span>
          <input
            type="text"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            onBlur={() => {
              if (cityName.trim() === "") return;
              scheduleSave("cityName", cityName.trim(), 0);
            }}
            placeholder="Bogotá, Medellín, …"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
        </label>
        <div>
          <span className="mb-1 block text-xs text-gray-600">Barrios</span>
          <div className="flex flex-wrap gap-2">
            {neighborhoods.map((n) => (
              <span
                key={n}
                className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs text-orange-900"
              >
                {n}
                <button
                  type="button"
                  onClick={() => removeNeighborhood(n)}
                  className="text-orange-700 hover:text-orange-900"
                  aria-label={`Quitar ${n}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={neighborhoodInput}
              onChange={(e) => setNeighborhoodInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNeighborhood();
                }
              }}
              placeholder="Agregar barrio + Enter"
              className="min-w-[180px] flex-1 rounded-md border border-gray-300 px-3 py-1 text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Tipo */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Tipo de propiedad</h2>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((t) => {
            const active = propertyTypes.includes(t);
            return (
              <button
                type="button"
                key={t}
                onClick={() => toggleArray("propertyTypes", propertyTypes, setPropertyTypes, t)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  active
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </section>

      {/* Tamaño */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Tamaño</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs text-gray-600">Área mín (m²)</span>
            <input
              type="number"
              value={minAreaM2}
              onChange={(e) => onNumChange("minAreaM2", e.target.value, setMinAreaM2)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-gray-600">Área máx (m²)</span>
            <input
              type="number"
              value={maxAreaM2}
              onChange={(e) => onNumChange("maxAreaM2", e.target.value, setMaxAreaM2)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-gray-600">Habitaciones mín</span>
            <input
              type="number"
              value={minBedrooms}
              onChange={(e) => onNumChange("minBedrooms", e.target.value, setMinBedrooms)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-gray-600">Baños mín</span>
            <input
              type="number"
              value={minBathrooms}
              onChange={(e) => onNumChange("minBathrooms", e.target.value, setMinBathrooms)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </label>
        </div>
      </section>

      {/* Servicios */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Servicios</h2>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map((s) => {
            const active = services.includes(s);
            return (
              <button
                type="button"
                key={s}
                onClick={() => toggleArray("services", services, setServices, s)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  active
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {SERVICE_LABELS[s]}
              </button>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Características</h2>
        <div className="flex flex-wrap gap-2">
          {FEATURES.map((f) => {
            const active = features.includes(f);
            return (
              <button
                type="button"
                key={f}
                onClick={() => toggleArray("features", features, setFeatures, f)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  active
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {FEATURE_LABELS[f]}
              </button>
            );
          })}
        </div>
      </section>

      {/* Notas libres */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Notas libres</h2>
          <span className="text-xs text-gray-500">{freeNotes.length}/1000</span>
        </div>
        <textarea
          value={freeNotes}
          maxLength={1000}
          onChange={(e) => {
            setFreeNotes(e.target.value);
            scheduleSave("freeNotes", e.target.value);
          }}
          rows={4}
          placeholder="Cualquier cosa que quieras que Vistaagent recuerde de tu búsqueda…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        />
      </section>

      {/* Danger zone */}
      <section className="rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="mb-2 text-sm font-semibold text-red-900">Borrar todo</h2>
        <p className="mb-3 text-xs text-red-800">
          Esto borra todo lo que Vistaagent aprendió de ti. No se puede deshacer.
        </p>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Borrar todo lo que Vistaagent sabe de mí
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteAll}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Sí, borrar todo
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
