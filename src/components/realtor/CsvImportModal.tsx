"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ImportResult = {
  created: number;
  errors: { row: number; reason: string }[];
};

export default function CsvImportModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/properties/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error importando");
      setResult(data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = "titulo,tipo,precio,moneda,habitaciones,banos,area_m2,piso,anio_construccion,estado,pais_codigo,ciudad,descripcion,servicios,enlace_directo";
    const example = "Apto moderno en Chapinero,APARTMENT,350000000,COP,2,2,65,,2020,ACTIVE,CO,Bogotá,Hermoso apartamento con vista a la montaña,pool|gym|parking,";
    const blob = new Blob([headers + "\n" + example], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_propiedades.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Importar propiedades CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {!result ? (
          <>
            {/* Info de columnas */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <p className="font-medium mb-1">Columnas requeridas:</p>
              <p className="text-xs font-mono">titulo, tipo, precio, moneda, pais_codigo, ciudad</p>
              <p className="text-xs text-blue-600 mt-1">
                Tipos válidos: APARTMENT, HOUSE, LAND, OFFICE, COMMERCIAL
              </p>
              <p className="text-xs text-blue-600">
                Países: CO, US, MX, AR, CL &nbsp;|&nbsp; Servicios separados por |
              </p>
            </div>

            <button
              onClick={downloadTemplate}
              className="w-full mb-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-indigo-600 hover:bg-gray-50 transition"
            >
              ⬇ Descargar plantilla de ejemplo
            </button>

            {/* Upload area */}
            <div
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50 transition"
            >
              <p className="text-3xl mb-2">📄</p>
              <p className="text-sm text-gray-600 font-medium">
                {file ? file.name : "Haz clic para seleccionar tu CSV"}
              </p>
              {file && (
                <p className="text-xs text-gray-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="flex-1 py-2.5 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? "Importando..." : "Importar"}
              </button>
            </div>
          </>
        ) : (
          /* Resultado */
          <div>
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
              <span className="text-3xl">✅</span>
              <div>
                <p className="font-semibold text-green-800">
                  {result.created} propiedad{result.created !== 1 ? "es" : ""} importada{result.created !== 1 ? "s" : ""}
                </p>
                {result.errors.length > 0 && (
                  <p className="text-sm text-yellow-700">{result.errors.length} fila{result.errors.length !== 1 ? "s" : ""} con error</p>
                )}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 mb-4">
                {result.errors.map((e) => (
                  <div key={e.row} className="text-xs p-2 bg-red-50 border border-red-100 rounded text-red-700">
                    <span className="font-medium">Fila {e.row}:</span> {e.reason}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gray-900 rounded-lg text-sm font-medium text-white hover:bg-gray-800 transition"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
