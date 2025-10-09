import { useState } from 'react'
import { Database, Loader2, Download } from "lucide-react";
import { useAuth } from '@/context/AuthContext'

/** -----------------------------
 *  Botão + Modal "Zero Glosa"
 *  -----------------------------
 *  - Botão compacto no topo direito.
 *  - Abre modal minimalista com seleção de relatório.
 *  - Integra com o servidor: POST /api/robo/:id
 */
function ZeroGlosaExport() {
  const { role } = useAuth()
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const OPTIONS = [
    { id: "analitico_glosas", nome: "Analítico de Glosas" },
    { id: "visao_pagamento", nome: "Análise de Glosa – Visão por Pagamento" },
    { id: "glosa_mantida", nome: "Glosa Mantida" },
  ] as const;

  const runExport = async () => {
    if (!selected) return alert("Selecione um relatório.");
    try {
      setLoading(true);
      const resp = await fetch(`/api/robo/${selected}`, { method: "POST" });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || "Falha ao gerar relatório");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selected}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Apenas admins e gestores podem ver este botão
  if (!['admin', 'manager'].includes(role || '')) {
    return null
  }

  return (
    <>
      {/* Botão discreto (header): “Zero Glosa” */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-yellow-400 bg-yellow-400/20 px-3 py-2 text-sm font-semibold text-yellow-700 hover:bg-yellow-400/30 transition"
        title="Exportar relatórios do Zero Glosa"
      >
        <Database className="h-4 w-4" />
        Zero Glosa
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[360px] rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Exportar do Zero Glosa</h2>
              <p className="text-xs text-gray-500 mt-1">
                Selecione um relatório para baixar.
              </p>
            </div>

            <label className="text-sm font-medium text-gray-700">Relatório</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Selecione...</option>
              {OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.nome}
                </option>
              ))}
            </select>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={runExport}
                disabled={loading || !selected}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** -----------------------------
 *  Dashboard (Power BI embed)
 *  ----------------------------- */
const pages = [
  { id: "glosa", label: "Glosa", pageName: "f79f6b269b6876e42ae7" }
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>("glosa");

  // Base da URL de embed sem pageName
  const reportBaseUrl =
    "https://app.powerbi.com/reportEmbed?reportId=8acb1b78-1f4a-4eb2-9dab-b3f5e9c3783d&autoAuth=true&ctid=1b4ff8a1-90f8-4ca6-854d-c5c61aff2ecb";

  // URL final com pageName + hides
  const current = pages.find((p) => p.id === activeTab);
  const embedUrl =
    `${reportBaseUrl}` +
    `&pageName=${current?.pageName}` +
    `&filterPaneEnabled=false` +
    `&navContentPaneEnabled=false`;

  return (
    <div>
      {/* Header com botão discreto à direita */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <ZeroGlosaExport />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex space-x-4 border-b">
        {pages.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-yellow-400 text-yellow-500"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Power BI */}
      <div className="rounded-lg bg-gray-50 p-4">
        <div className="h-[70vh] w-full xl:h-[80vh]">
          <iframe
            title={`Dashboard Glosa - ${activeTab}`}
            src={embedUrl}
            className="h-full w-full rounded-lg border-0"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
