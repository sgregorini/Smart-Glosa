import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

const OPTIONS = [
  { id: "analitico_glosas", nome: "Analítico de Glosas" },
  { id: "visao_pagamento", nome: "Visão por Pagamento" },
  { id: "glosa_mantida", nome: "Glosa Mantida" },
];

export default function RoboRelatoriosModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState("");

  const onRun = async () => {
    if (!selected) return alert("Selecione um relatório");
    try {
      setLoading(true);
      const resp = await fetch(`/api/robo/${selected}`, { method: "POST" });
      if (!resp.ok) throw new Error("Falha ao gerar relatório");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selected}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão discreto (navbar ou header) */}
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg hover:bg-gray-100"
        title="Exportar Relatórios"
      >
        <Download className="h-5 w-5 text-gray-700" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[320px]">
            <h2 className="text-lg font-semibold mb-4">Exportar Relatório</h2>

            <select
              className="w-full border rounded-lg px-3 py-2 mb-4"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Selecione...</option>
              {OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.nome}</option>
              ))}
            </select>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg border text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={onRun}
                disabled={loading || !selected}
                className="px-4 py-2 rounded-lg bg-yellow-400 text-black font-medium hover:bg-yellow-500 disabled:opacity-60 flex items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
