// src/__tests__/csv.test.ts
// Tests unitarios para src/lib/csv.ts — parseCSV y toCSV

import { describe, it, expect } from "vitest";
import { parseCSV, toCSV } from "@/lib/csv";

// ── parseCSV ─────────────────────────────────────────────────────────────────
describe("parseCSV", () => {
  it("parsea un CSV simple de 2 columnas", () => {
    const csv = "nombre,precio\nApto Bogotá,350000000";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ nombre: "Apto Bogotá", precio: "350000000" });
  });

  it("parsea múltiples filas", () => {
    const csv = "titulo,tipo\nCasa Sur,HOUSE\nApto Norte,APARTMENT";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].titulo).toBe("Casa Sur");
    expect(rows[1].tipo).toBe("APARTMENT");
  });

  it("respeta campos entre comillas con comas internas", () => {
    const csv = `titulo,descripcion\n"Apto, amplio","Cerca al parque, 3 cuartos"`;
    const rows = parseCSV(csv);
    expect(rows[0].titulo).toBe("Apto, amplio");
    expect(rows[0].descripcion).toBe("Cerca al parque, 3 cuartos");
  });

  it("normaliza headers a minúsculas", () => {
    const csv = "TITULO,PRECIO\nCasa,100";
    const rows = parseCSV(csv);
    expect(rows[0]).toHaveProperty("titulo");
    expect(rows[0]).toHaveProperty("precio");
  });

  it("retorna array vacío si el CSV tiene solo headers", () => {
    const csv = "titulo,precio";
    expect(parseCSV(csv)).toEqual([]);
  });

  it("retorna array vacío si el texto está vacío", () => {
    expect(parseCSV("")).toEqual([]);
  });

  it("maneja saltos de línea \\r\\n (Windows)", () => {
    const csv = "a,b\r\n1,2\r\n3,4";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ a: "1", b: "2" });
  });

  it("rellena con string vacío si una fila tiene menos columnas", () => {
    const csv = "a,b,c\n1,2";
    const rows = parseCSV(csv);
    expect(rows[0].c).toBe("");
  });

  it("elimina comillas alrededor del valor completo", () => {
    const csv = `titulo\n"Casa Bonita"`;
    const rows = parseCSV(csv);
    expect(rows[0].titulo).toBe("Casa Bonita");
  });
});

// ── toCSV ─────────────────────────────────────────────────────────────────────
describe("toCSV", () => {
  it("genera CSV con headers y datos", () => {
    const rows = [{ titulo: "Casa", precio: "200000" }];
    const csv = toCSV(rows);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("titulo,precio");
    expect(lines[1]).toBe("Casa,200000");
  });

  it("retorna string vacío para array vacío", () => {
    expect(toCSV([])).toBe("");
  });

  it("escapa campos con comas entre comillas dobles", () => {
    const rows = [{ descripcion: "Apto, amplio" }];
    const csv = toCSV(rows);
    expect(csv).toContain('"Apto, amplio"');
  });

  it("escapa comillas internas duplicándolas", () => {
    const rows = [{ titulo: 'Casa "El Nogal"' }];
    const csv = toCSV(rows);
    expect(csv).toContain('"Casa ""El Nogal"""');
  });

  it("maneja valores null y undefined como string vacío", () => {
    const rows = [{ a: null, b: undefined, c: "ok" }];
    const csv = toCSV(rows);
    expect(csv.split("\n")[1]).toBe(",,ok");
  });

  it("es round-trip con parseCSV para datos simples", () => {
    const original = [
      { titulo: "Apto Chapinero", precio: "350000000", tipo: "APARTMENT" },
      { titulo: "Casa Usaquén", precio: "800000000", tipo: "HOUSE" },
    ];
    const csv = toCSV(original);
    const parsed = parseCSV(csv);
    expect(parsed).toEqual(original);
  });
});
