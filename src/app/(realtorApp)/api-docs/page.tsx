"use client";

import { useEffect, useState } from "react";

type ApiKey = {
  id: string;
  name: string;
  active: boolean;
  lastUsed: string | null;
  createdAt: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://inmobiliaria-ai-taupe.vercel.app";

const CODE_BLOCK = `curl -H "Authorization: Bearer chat_sk_TU_API_KEY" \\
  "${BASE_URL}/api/v1/properties"`;

const CODE_SINGLE = `curl -H "Authorization: Bearer chat_sk_TU_API_KEY" \\
  "${BASE_URL}/api/v1/properties/PROPERTY_ID"`;

const CODE_RESPONSE = `{
  "data": [
    {
      "id": "clx...",
      "title": "Apto moderno en Chapinero",
      "type": "APARTMENT",
      "price": 350000000,
      "currency": "COP",
      "bedrooms": 2,
      "bathrooms": 2,
      "areaM2": 65,
      "photoUrls": ["https://..."],
      "city": { "name": "Bogotá" },
      "country": { "code": "CO", "name": "Colombia" }
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 20, "pages": 3 }
}`;

export default function ApiDocsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newPlainKey, setNewPlainKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const fetchKeys = async () => {
    const res = await fetch("/api/api-keys");
    const data = await res.json();
    setKeys(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const createKey = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    setNewPlainKey(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewPlainKey(data.plain);
      setNewName("");
      fetchKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!confirm("¿Revocar esta API key? Las apps que la usen dejarán de funcionar.")) return;
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    fetchKeys();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API Keys & Documentación</h1>
        <p className="text-gray-500 text-sm mt-1">
          Integra tus propiedades en cualquier app usando nuestra API REST.
        </p>
      </div>

      {/* Keys section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Tus API Keys</h2>

        {/* Nueva key */}
        <div className="flex gap-2 mb-5">
          <input
            type="text"
            placeholder="Nombre de la key (ej: Mi App, CRM)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createKey()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={createKey}
            disabled={creating || !newName.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {creating ? "Creando..." : "Crear key"}
          </button>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {/* Key recién creada — mostrar UNA sola vez */}
        {newPlainKey && (
          <div className="mb-5 p-4 bg-green-50 border border-green-300 rounded-xl">
            <p className="text-sm font-semibold text-green-800 mb-2">
              ✅ API Key creada — cópiala ahora, no se mostrará de nuevo
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 text-green-900 break-all">
                {newPlainKey}
              </code>
              <button
                onClick={() => copy(newPlainKey)}
                className="px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition shrink-0"
              >
                {copied ? "¡Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
        )}

        {/* Lista de keys */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sin API keys. Crea una arriba.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                    {k.name}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${k.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {k.active ? "Activa" : "Revocada"}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Creada {new Date(k.createdAt).toLocaleDateString("es-CO")}
                    {k.lastUsed && ` · Último uso ${new Date(k.lastUsed).toLocaleDateString("es-CO")}`}
                  </p>
                </div>
                {k.active && (
                  <button
                    onClick={() => revokeKey(k.id)}
                    className="text-xs text-red-600 hover:text-red-800 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition"
                  >
                    Revocar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documentación */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-gray-900">Referencia de la API</h2>

        {/* Base URL */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Base URL</p>
          <code className="text-sm text-indigo-700">{BASE_URL}/api/v1</code>
        </div>

        {/* Auth */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-2">🔑 Autenticación</h3>
          <p className="text-sm text-gray-600 mb-3">
            Incluye tu API key en el header <code className="bg-gray-100 px-1 rounded">Authorization</code>:
          </p>
          <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto">
{`Authorization: Bearer chat_sk_TU_API_KEY`}
          </pre>
        </div>

        {/* Endpoint 1 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">GET</span>
            <code className="text-sm text-gray-800">/api/v1/properties</code>
          </div>
          <p className="text-sm text-gray-600 mb-3">Lista tus propiedades activas. Soporta paginación y filtros.</p>
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Query params</p>
            <table className="w-full text-xs">
              <thead><tr className="text-gray-400"><th className="text-left py-1">Param</th><th className="text-left py-1">Tipo</th><th className="text-left py-1">Descripción</th></tr></thead>
              <tbody className="text-gray-600 divide-y divide-gray-100">
                <tr><td className="py-1.5 font-mono">page</td><td>number</td><td>Página (default: 1)</td></tr>
                <tr><td className="py-1.5 font-mono">limit</td><td>number</td><td>Por página, máx 50 (default: 20)</td></tr>
                <tr><td className="py-1.5 font-mono">type</td><td>string</td><td>APARTMENT | HOUSE | LAND | OFFICE | COMMERCIAL</td></tr>
                <tr><td className="py-1.5 font-mono">city_id</td><td>string</td><td>ID de ciudad</td></tr>
              </tbody>
            </table>
          </div>
          <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
{CODE_BLOCK}
          </pre>
          <pre className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-4 overflow-x-auto mt-3 whitespace-pre-wrap">
{CODE_RESPONSE}
          </pre>
        </div>

        {/* Endpoint 2 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">GET</span>
            <code className="text-sm text-gray-800">/api/v1/properties/:id</code>
          </div>
          <p className="text-sm text-gray-600 mb-3">Retorna el detalle completo de una propiedad incluyendo datos del realtor.</p>
          <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
{CODE_SINGLE}
          </pre>
        </div>

        {/* Rate limits */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">⚠️ Rate limits</p>
          <p>Máximo <strong>100 requests / minuto</strong> por API key. Máximo <strong>5 keys activas</strong> por cuenta.</p>
        </div>
      </div>
    </div>
  );
}
