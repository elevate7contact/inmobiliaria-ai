// src/components/realtor/PropertyForm.tsx
// Formulario completo para crear/editar Property. Validación cliente con Zod.
// CREATE: POST /api/properties → con el id devuelto sube las pendingFiles vía PhotoUploadField.
// EDIT:   PATCH /api/properties/[id]; las fotos ya se manejan inline via /api/properties/[id]/photos.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import PhotoUploadField from "./PhotoUploadField";

const PROPERTY_TYPES = [
  { value: "APARTMENT", label: "Apartamento" },
  { value: "HOUSE", label: "Casa" },
  { value: "LAND", label: "Lote" },
  { value: "OFFICE", label: "Oficina" },
  { value: "COMMERCIAL", label: "Local comercial" },
] as const;

const SERVICE_OPTIONS = [
  "parking",
  "pool",
  "gym",
  "security",
  "elevator",
  "balcony",
  "garden",
  "ac",
  "heating",
  "furnished",
];

const FormSchema = z.object({
  title: z.string().min(3, "Mínimo 3 caracteres").max(200),
  description: z.string().min(10, "Mínimo 10 caracteres"),
  price: z.number().positive("Precio debe ser positivo"),
  currency: z.string().min(2).max(8),
  type: z.enum(["APARTMENT", "HOUSE", "LAND", "OFFICE", "COMMERCIAL"]),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  areaM2: z.number().positive("Área debe ser positiva"),
  countryId: z.string().min(1, "Seleccioná país"),
  cityId: z.string().min(1, "Seleccioná ciudad"),
  floor: z.number().int().nullable(),
  yearBuilt: z.number().int().nullable(),
  services: z.array(z.string()),
  directLink: z.string().url("URL inválida").or(z.literal("")),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});

type FormValues = z.infer<typeof FormSchema>;

export type InitialProperty = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  countryId: string;
  cityId: string;
  floor: number | null;
  yearBuilt: number | null;
  services: string[];
  directLink: string | null;
  photoUrls: string[];
  lat: number | null;
  lng: number | null;
  status: "ACTIVE" | "INACTIVE" | "SOLD";
};

type Country = { id: string; name: string; currency: string; cities: { id: string; name: string }[] };

export default function PropertyForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: InitialProperty;
}) {
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [values, setValues] = useState<FormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    price: initial?.price ?? 0,
    currency: initial?.currency ?? "COP",
    type: (initial?.type as FormValues["type"]) ?? "APARTMENT",
    bedrooms: initial?.bedrooms ?? 0,
    bathrooms: initial?.bathrooms ?? 0,
    areaM2: initial?.areaM2 ?? 0,
    countryId: initial?.countryId ?? "",
    cityId: initial?.cityId ?? "",
    floor: initial?.floor ?? null,
    yearBuilt: initial?.yearBuilt ?? null,
    services: initial?.services ?? [],
    directLink: initial?.directLink ?? "",
    lat: initial?.lat ?? null,
    lng: initial?.lng ?? null,
  });

  const [photoUrls, setPhotoUrls] = useState<string[]>(initial?.photoUrls ?? []);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/countries");
        const data = await res.json();
        setCountries(data.countries ?? []);
      } catch {
        // silent
      } finally {
        setLoadingCountries(false);
      }
    })();
  }, []);

  const currentCountry = countries.find((c) => c.id === values.countryId);
  const cities = currentCountry?.cities ?? [];

  const set = <K extends keyof FormValues>(key: K, val: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const toggleService = (s: string) => {
    setValues((prev) => ({
      ...prev,
      services: prev.services.includes(s)
        ? prev.services.filter((x) => x !== s)
        : [...prev.services, s],
    }));
  };

  const submit = async (publish: boolean) => {
    setError(null);
    setFieldErrors({});
    const parsed = FormSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0];
        if (typeof k === "string") errs[k] = issue.message;
      }
      setFieldErrors(errs);
      setError("Revisá los campos marcados");
      return;
    }

    const payload = {
      ...parsed.data,
      directLink: parsed.data.directLink || undefined,
      status: publish ? "ACTIVE" : "INACTIVE",
    };

    setSubmitting(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/properties", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error creando");

        const newId = data.property.id as string;

        // Subir pendingFiles si hay
        if (pendingFiles.length > 0) {
          const fd = new FormData();
          pendingFiles.forEach((f) => fd.append("photos", f));
          const photoRes = await fetch(`/api/properties/${newId}/photos`, {
            method: "POST",
            body: fd,
          });
          if (!photoRes.ok) {
            const pdata = await photoRes.json().catch(() => ({}));
            throw new Error(
              `Propiedad creada pero falló subida de fotos: ${pdata.error ?? photoRes.statusText}`
            );
          }
        }

        router.push(`/properties/${newId}/edit`);
        router.refresh();
      } else if (initial) {
        const res = await fetch(`/api/properties/${initial.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error actualizando");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (k: keyof FormValues) => fieldErrors[k as string];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(true);
      }}
      className="space-y-8"
    >
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Información básica</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Título</label>
            <input
              type="text"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Apartamento en Chapinero, 2 hab, vista panorámica"
            />
            {fieldError("title") && <p className="mt-1 text-xs text-red-700">{fieldError("title")}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              rows={5}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {fieldError("description") && <p className="mt-1 text-xs text-red-700">{fieldError("description")}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo</label>
            <select
              value={values.type}
              onChange={(e) => set("type", e.target.value as FormValues["type"])}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Moneda</label>
            <select
              value={values.currency}
              onChange={(e) => set("currency", e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="COP">COP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MXN">MXN</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Precio</label>
            <input
              type="number"
              value={values.price || ""}
              onChange={(e) => set("price", Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {fieldError("price") && <p className="mt-1 text-xs text-red-700">{fieldError("price")}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Área (m²)</label>
            <input
              type="number"
              step="0.01"
              value={values.areaM2 || ""}
              onChange={(e) => set("areaM2", Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {fieldError("areaM2") && <p className="mt-1 text-xs text-red-700">{fieldError("areaM2")}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Características</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Habitaciones</label>
            <input
              type="number"
              min={0}
              value={values.bedrooms}
              onChange={(e) => set("bedrooms", Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Baños</label>
            <input
              type="number"
              min={0}
              value={values.bathrooms}
              onChange={(e) => set("bathrooms", Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Piso</label>
            <input
              type="number"
              value={values.floor ?? ""}
              onChange={(e) =>
                set("floor", e.target.value === "" ? null : Number(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Año construcción</label>
            <input
              type="number"
              value={values.yearBuilt ?? ""}
              onChange={(e) =>
                set("yearBuilt", e.target.value === "" ? null : Number(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700">Servicios</label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {SERVICE_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={values.services.includes(s)}
                  onChange={() => toggleService(s)}
                  className="rounded"
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Ubicación</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">País</label>
            <select
              value={values.countryId}
              onChange={(e) => {
                set("countryId", e.target.value);
                set("cityId", "");
              }}
              disabled={loadingCountries}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">{loadingCountries ? "Cargando..." : "Seleccionar"}</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldError("countryId") && <p className="mt-1 text-xs text-red-700">{fieldError("countryId")}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ciudad</label>
            <select
              value={values.cityId}
              onChange={(e) => set("cityId", e.target.value)}
              disabled={!values.countryId}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar</option>
              {cities.map((ci) => (
                <option key={ci.id} value={ci.id}>
                  {ci.name}
                </option>
              ))}
            </select>
            {fieldError("cityId") && <p className="mt-1 text-xs text-red-700">{fieldError("cityId")}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Latitud{" "}
              <span className="text-xs text-gray-500" title="Podés copiarla desde Google Maps">
                (opcional)
              </span>
            </label>
            <input
              type="number"
              step="0.000001"
              value={values.lat ?? ""}
              onChange={(e) =>
                set("lat", e.target.value === "" ? null : Number(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Longitud <span className="text-xs text-gray-500">(opcional)</span>
            </label>
            <input
              type="number"
              step="0.000001"
              value={values.lng ?? ""}
              onChange={(e) =>
                set("lng", e.target.value === "" ? null : Number(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Enlace directo (opcional)</h2>
        <input
          type="url"
          value={values.directLink}
          onChange={(e) => set("directLink", e.target.value)}
          placeholder="https://mi-inmobiliaria.com/propiedad/123"
          className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {fieldError("directLink") && <p className="mt-1 text-xs text-red-700">{fieldError("directLink")}</p>}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <PhotoUploadField
          propertyId={initial?.id}
          initialUrls={photoUrls}
          pendingFiles={pendingFiles}
          onUrlsChange={setPhotoUrls}
          onPendingFilesChange={setPendingFiles}
        />
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit(false)}
          className="rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Guardar como borrador
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "Guardando..." : mode === "create" ? "Publicar" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
