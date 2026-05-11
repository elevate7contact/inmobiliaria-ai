"use client";

import { useState } from "react";
import CsvImportModal from "./CsvImportModal";

export default function CsvActions() {
  const [showImport, setShowImport] = useState(false);

  const handleExport = () => {
    window.location.href = "/api/properties/export";
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          ⬇ Exportar CSV
        </button>
        <button
          onClick={() => setShowImport(true)}
          className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition"
        >
          ⬆ Importar CSV
        </button>
      </div>

      {showImport && <CsvImportModal onClose={() => setShowImport(false)} />}
    </>
  );
}
