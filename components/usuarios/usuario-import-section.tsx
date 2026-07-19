"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, FileUp, Loader2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import {
  authService,
  type BulkImportUsersResult,
  type CreatePanelUserPayload,
} from "@/lib/auth-service";
import { getApiErrorMessage } from "@/lib/api";
import { toast } from "sonner";

const CSV_TEMPLATE = `nombre,email,telefono,rol
Ejemplo Guardia,ejemplo@institucion.gob.ec,0999999999,Operador
Ejemplo Patrullero,patrullero@institucion.gob.ec,,Policia`;

function downloadTextTemplate(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadExcelTemplate() {
  const rows = [
    {
      nombre: "Ejemplo Guardia",
      email: "ejemplo@institucion.gob.ec",
      telefono: "0999999999",
      rol: "Operador",
    },
    {
      nombre: "Ejemplo Patrullero",
      email: "patrullero@institucion.gob.ec",
      telefono: "",
      rol: "Policia",
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Usuarios");
  XLSX.writeFile(workbook, "plantilla-usuarios.xlsx");
}

interface UsuarioImportSectionProps {
  onImported: () => void;
}

export function UsuarioImportSection({ onImported }: UsuarioImportSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rolNombre, setRolNombre] =
    useState<CreatePanelUserPayload["rolNombre"]>("Operador");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkImportUsersResult | null>(null);

  const handleImport = async () => {
    if (!file) {
      toast.error("Selecciona un archivo CSV o Excel");
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const data = await authService.importPanelUsers(file, rolNombre);
      setResult(data);
      toast.success(data.message ?? "Importación completada");
      if (data.created > 0) {
        onImported();
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo importar el archivo"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-[#334155] bg-[#1e293b] p-6">
      <div className="mb-1 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0ea5e9]/15 ring-1 ring-[#0ea5e9]/30">
          <Upload className="h-4 w-4 text-[#7dd3fc]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Importación masiva</h2>
          <p className="text-xs text-[#64748b]">Excel o CSV · hasta 500 registros</p>
        </div>
      </div>

      <p className="mb-4 mt-4 text-sm leading-relaxed text-[#94a3b8]">
        Sube un archivo con nombre, correo y teléfono (opcional). Asigna un rol por
        defecto al lote o incluye la columna{" "}
        <code className="rounded bg-[#0f172a] px-1 text-[#cbd5e1]">rol</code>{" "}
        en cada fila.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadExcelTemplate}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-[#cbd5e1] hover:border-[#6366f1]/40"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Plantilla Excel
        </button>
        <button
          type="button"
          onClick={() =>
            downloadTextTemplate("plantilla-usuarios.csv", CSV_TEMPLATE, "text/csv")
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-[#cbd5e1] hover:border-[#6366f1]/40"
        >
          <Download className="h-3.5 w-3.5" />
          Plantilla CSV
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="import-rol" className="mb-1.5 block text-sm font-medium text-[#e2e8f0]">
            Rol por defecto del archivo
          </label>
          <select
            id="import-rol"
            value={rolNombre}
            onChange={(e) =>
              setRolNombre(e.target.value as CreatePanelUserPayload["rolNombre"])
            }
            className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white"
          >
            <option value="Operador">Operador</option>
            <option value="Policia">Policía</option>
          </select>
          <p className="mt-1.5 text-xs text-[#64748b]">
            Se aplica a filas que no tengan columna{" "}
            <span className="text-[#94a3b8]">rol</span> definida.
          </p>
        </div>

        <div>
          <label htmlFor="import-file" className="mb-1.5 block text-sm font-medium text-[#e2e8f0]">
            Archivo
          </label>
          <label
            htmlFor="import-file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#334155] bg-[#0f172a]/60 px-4 py-6 transition-colors hover:border-[#6366f1]/50"
          >
            <FileUp className="mb-2 h-8 w-8 text-[#64748b]" />
            <span className="text-sm text-[#94a3b8]">
              {file ? file.name : "Seleccionar Excel (.xlsx) o CSV"}
            </span>
            <span className="mt-1 text-xs text-[#64748b]">Máximo 500 registros · 1 MB</span>
          </label>
          <input
            ref={inputRef}
            id="import-file"
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <button
          type="button"
          disabled={submitting || !file}
          onClick={handleImport}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0ea5e9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Importando..." : "Importar y enviar invitaciones"}
        </button>
      </div>

      {result && (
        <div className="mt-6 rounded-xl border border-[#334155] bg-[#0f172a]/60 p-4">
          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="text-[#64748b]">Creados</p>
              <p className="text-lg font-bold text-[#22c55e]">{result.created}</p>
            </div>
            <div>
              <p className="text-[#64748b]">Omitidos</p>
              <p className="text-lg font-bold text-[#f59e0b]">{result.skipped}</p>
            </div>
            <div>
              <p className="text-[#64748b]">Errores</p>
              <p className="text-lg font-bold text-[#ef4444]">{result.failed}</p>
            </div>
          </div>

          {result.results.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-[#334155]/60">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#0f172a] text-[#64748b]">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">Fila</th>
                    <th className="px-2 py-1.5 text-left font-medium">Nombre</th>
                    <th className="px-2 py-1.5 text-left font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row, i) => (
                    <tr key={`${row.row}-${i}`} className="border-t border-[#334155]/40">
                      <td className="px-2 py-1.5 text-[#94a3b8]">{row.row}</td>
                      <td className="px-2 py-1.5 text-[#e2e8f0]">
                        <div>{row.nombre}</div>
                        <div className="text-[#64748b]">{row.email}</div>
                      </td>
                      <td className="px-2 py-1.5">
                        <span
                          className={
                            row.status === "created"
                              ? "text-[#22c55e]"
                              : row.status === "skipped"
                                ? "text-[#f59e0b]"
                                : "text-[#ef4444]"
                          }
                        >
                          {row.status === "created"
                            ? "Creado"
                            : row.status === "skipped"
                              ? "Omitido"
                              : "Error"}
                          {row.message ? ` · ${row.message}` : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
