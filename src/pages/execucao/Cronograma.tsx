import React, { useEffect, useMemo, useState, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GanttChart as GanttIcon, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import DetalhesAcaoModal from "@/components/DetalhesAcaoModal"
import type { AcaoView, EtapaDetalhe, Responsavel, StatusAcaoTipo, Setor } from "@/types"
import { Gantt, ViewMode, type Task, type Dependency } from "@wamra/gantt-task-react"
import "@wamra/gantt-task-react/dist/style.css"

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS E TIPOS
// ─────────────────────────────────────────────────────────────────────────────

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

type EtapaDependency = {
  id: string;
  source_etapa_id: string;
  target_etapa_id: string;
};

export type CustomTask = Task & {
  original?: AcaoView | EtapaDetalhe;
  responsavel?: string;
  status?: string;
  project?: string; // Mantido para consistência, embora usemos 'parent'
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES CUSTOMIZADOS PARA O GANTT
// ─────────────────────────────────────────────────────────────────────────────

const CustomTooltipContent: React.FC<{ task: CustomTask }> = ({ task }) => {
    return (
        <div className="bg-popover text-popover-foreground rounded-md border p-2 shadow-md min-w-[180px]">
            <strong>{task.name}</strong>
            <div className="text-sm">Responsável: {task.responsavel || "N/A"}</div>
            <div className="text-sm">Status: {task.status || "N/A"}</div>
        </div>
    );
};

export default function Cronograma() {
  const { user, role, currentOrgId } = useAuth()

  // dados
  const [acoes, setAcoes] = useState<AcaoView[]>([])
  const [etapas, setEtapas] = useState<EtapaDetalhe[]>([])
  const [dependencies, setDependencies] = useState<EtapaDependency[]>([]);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [statusTipos, setStatusTipos] = useState<StatusAcaoTipo[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [loading, setLoading] = useState(true)

  // filtros e UI
  const [searchQuery, setSearchQuery] = useState("")
  const [filterResponsavel, setFilterResponsavel] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterSetor, setFilterSetor] = useState("all")
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month)
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({})
  
  // modal
  const [selectedAcao, setSelectedAcao] = useState<AcaoView | null>(null)
  const [etapasModal, setEtapasModal] = useState<EtapaDetalhe[]>([])
  const [loadingEtapasModal, setLoadingEtapasModal] = useState(false)

  // ------------------------------------------------------------
  // FETCH
  // ------------------------------------------------------------
  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)
      try {
        const { data: acoesRaw, error: e1 } = await supabase.from("vw_acoes_detalhadas").select("*")
        if (e1) throw e1
        setAcoes(Array.isArray(acoesRaw) ? (acoesRaw as AcaoView[]) : [])

        const { data: etapasData, error: e2 } = await supabase.from("vw_etapas_detalhadas").select("*")
        if (e2) throw e2
        setEtapas((etapasData || []) as EtapaDetalhe[])

        const { data: dependenciesData, error: e3 } = await supabase.from("etapa_dependencies").select("*");
        if (e3) throw e3;
        setDependencies(dependenciesData || []);

        const [{ data: rs }, { data: sts }, { data: setrs }] = await Promise.all([
          supabase.from("responsaveis").select("id,nome").order("nome"),
          supabase.from("status_acao_tipos").select("id,nome").order("nome"),
          supabase.from("setores").select("id,nome").order("nome"),
        ])
        if (rs) setResponsaveis(rs as Responsavel[])
        if (sts) setStatusTipos(sts as StatusAcaoTipo[])
        if (setrs) setSetores(setrs as Setor[])

      } catch (err: any) {
        console.error(err)
        toast.error("Erro ao carregar cronograma.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, role, currentOrgId])

  // ------------------------------------------------------------
  // Handlers de Interação com o Gantt
  // ------------------------------------------------------------

    const handleDateChange = async (task: Task, children: Task[]) => {
        const startDate = task.start.toISOString().slice(0, 10);
        const endDate = task.end.toISOString().slice(0, 10);

        if (task.type === 'project') {
            const updates = { dt_inicio_acao: startDate, dt_termino_acao: endDate };
            const { error } = await supabase.from('acoes').update(updates).eq('id', task.id);

            if (error) {
                toast.error(`Falha ao atualizar as datas da ação "${task.name}".`);
                console.error(error);
            } else {
                toast.success("Datas da ação atualizadas.");
                setAcoes(prev => prev.map(item => (item.id === task.id ? { ...item, ...updates } : item)));
            }
        } else {
            const updates = { dt_inicio_etapa: startDate, dt_termino_etapa: endDate };
            const { error } = await supabase.from('etapas').update(updates).eq('id', task.id);

            if (error) {
                toast.error(`Falha ao atualizar as datas da etapa "${task.name}".`);
                console.error(error);
            } else {
                toast.success("Datas da etapa atualizadas.");
                setEtapas(prev => prev.map(item => (item.id === task.id ? { ...item, ...updates } : item)));
            }
        }
    };
  
  const handleProgressChange = async (task: Task) => {
    if (task.type === 'project') return;
    const updates = { porcentagem_conclusao_etapa: task.progress };
    const { error } = await supabase.from('etapas').update(updates).eq('id', task.id);

    if (error) {
      toast.error(`Falha ao atualizar o progresso da etapa.`);
    } else {
      toast.success(`Progresso da etapa atualizado.`);
      setEtapas(prev => prev.map(item => (item.id === task.id ? { ...item, ...updates } : item)));
    }
  };

  const handleDependencyDelete = async (
    fromTask: Task,
    taskFromIndex: number,
    toTask: Task,
    taskToIndex: number
  ) => {
    const { error } = await supabase
      .from('etapa_dependencies')
      .delete()
      .match({ source_etapa_id: fromTask.id, target_etapa_id: toTask.id });

    if (error) {
      toast.error("Falha ao remover a dependência.");
    } else {
      toast.success("Dependência removida.");
      setDependencies(prev => 
        prev.filter(d => !(d.source_etapa_id === fromTask.id && d.target_etapa_id === toTask.id))
      );
    }
  };

  const handleRelationChange = async (
    from: [Task, string, number],
    to: [Task, string, number]
  ) => {
    const [fromTask] = from;
    const [toTask] = to;
    const newDependency = { source_etapa_id: fromTask.id, target_etapa_id: toTask.id };
    
    const { data, error } = await supabase.from('etapa_dependencies').insert(newDependency).select().single();
    if (data) {
      setDependencies(prev => [...prev, data]);
      toast.success("Dependência criada!");
    } else if (error) {
      toast.error("Falha ao criar dependência.");
      console.error(error);
    }
  };

  // ------------------------------------------------------------
  // Processamento de Dados para o Gantt
  // ------------------------------------------------------------
  const tasks: CustomTask[] = useMemo(() => {
    const dependenciesByTarget = new Map<string, string[]>();
    for (const dep of dependencies) {
      const sources = dependenciesByTarget.get(dep.target_etapa_id) || [];
      sources.push(dep.source_etapa_id);
      dependenciesByTarget.set(dep.target_etapa_id, sources);
    }
    
    const matchText = (txt?: string) => !searchQuery || (txt ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchResp = (id?: string | null) => filterResponsavel === "all" || (!!id && id === filterResponsavel);
    const matchSetor = (id?: string | null) => filterSetor === "all" || (!!id && id === filterSetor);
    const statusNameById = new Map(statusTipos.map(s => [s.id, s.nome]));
    const matchStatus = (acaoStatusId?: string | null, etapaStatusNome?: string | null) => {
      if (filterStatus === "all") return true;
      if (acaoStatusId) return statusNameById.get(filterStatus) === statusNameById.get(acaoStatusId);
      if (etapaStatusNome) return etapaStatusNome === statusNameById.get(filterStatus);
      return false;
    };
    const etapasByAcao = new Map<string, EtapaDetalhe[]>();
    for (const e of etapas) {
      const acaoId = e.id_acao;
      if (!acaoId) continue;
      const passEtapa = matchText(e.etapa_descricao || "") && matchResp(e.id_responsavel) && matchStatus(undefined, e.nm_status_etapa || null);
      if (!passEtapa) continue;
      const list = etapasByAcao.get(acaoId) || [];
      list.push(e);
      etapasByAcao.set(acaoId, list);
    }

    const out: CustomTask[] = [];

    for (const a of acoes) {
      const start = a.dt_inicio_acao ? new Date(a.dt_inicio_acao) : new Date();
      const end = a.dt_termino_acao ? new Date(a.dt_termino_acao) : addDays(start, 1);
      if (!isValidDate(start) || !isValidDate(end)) continue;

      const filhos = etapasByAcao.get(a.id) || [];
      const passAcao = matchText(a.acao_descricao || "") && matchResp(a.id_responsavel) && matchSetor(a.id_setor_responsavel) && matchStatus(a.id_status_acao, null);
      if (!passAcao && filhos.length === 0) continue;

      const statusAcao = a.nm_status_acao || "Não definido";
      let stylesAcao = { barProgressColor: "#3b82f6", barProgressSelectedColor: "#2563eb" };
      if (statusAcao === "Concluído") stylesAcao = { barProgressColor: "#22c55e", barProgressSelectedColor: "#16a34a" };
      else if (statusAcao === "Atrasado") stylesAcao = { barProgressColor: "#ef4444", barProgressSelectedColor: "#dc2626" };

      out.push({
        id: a.id,
        name: a.acao_descricao,
        start: startOfDay(start),
        end: startOfDay(end),
        progress: a.progresso_percentual || 0,
        type: "project",
        hideChildren: !!collapsedProjects[a.id],
        isDisabled: false,
        styles: stylesAcao,
        original: a,
        responsavel: a.nm_responsavel || undefined,
        status: statusAcao,
      });

      filhos.sort((x, y) => (x.etapa_descricao ?? "").localeCompare(y.etapa_descricao ?? ""));

      for (const e of filhos) {
        const es = e.dt_inicio_etapa ? new Date(e.dt_inicio_etapa) : start;
        const ee = e.dt_termino_etapa ? new Date(e.dt_termino_etapa) : addDays(es, 1);
        if (!isValidDate(es) || !isValidDate(ee)) continue;

        const statusEtapa = e.nm_status_etapa || "Não definido";
        let stylesEtapa = { barProgressColor: "#a78bfa", barProgressSelectedColor: "#8b5cf6" };
        if (statusEtapa === "Concluído") stylesEtapa = { barProgressColor: "#86efac", barProgressSelectedColor: "#4ade80" };
        else if (statusEtapa === "Atrasado") stylesEtapa = { barProgressColor: "#fca5a5", barProgressSelectedColor: "#f87171" };

        const dependenciesForTask: Dependency[] = (dependenciesByTarget.get(e.id) || []).map(sourceId => ({
            sourceId: sourceId,
            sourceTarget: 'endOfTask',
            ownTarget: 'startOfTask'
        }));

        out.push({
          id: e.id,
          name: e.etapa_descricao,
          start: startOfDay(es),
          end: startOfDay(ee),
          progress: Math.round(e.porcentagem_conclusao_etapa || 0),
          type: "task",
          parent: a.id,
          dependencies: dependenciesForTask,
          isDisabled: false,
          styles: stylesEtapa,
          original: e,
          responsavel: e.nm_responsavel || undefined,
          status: statusEtapa,
        } as CustomTask);
      }
    }
    return out;
  }, [acoes, etapas, dependencies, searchQuery, filterResponsavel, filterSetor, filterStatus, statusTipos, collapsedProjects]);

  // ------------------------------------------------------------
  // UI helpers
  // ------------------------------------------------------------
  const toggleAll = (collapse: boolean) => {
    const nextState: Record<string, boolean> = {};
    if (collapse) {
      for (const task of tasks) {
        if (task.type === 'project') {
          nextState[task.id] = true;
        }
      }
    }
    setCollapsedProjects(nextState);
  };

  const onExpanderClick = useCallback((task: Task) => {
    if (task.type === 'project') {
      setCollapsedProjects(prev => ({ ...prev, [task.id]: !prev[task.id] }));
    }
  }, []);

  const openAcaoModal = async (acaoId: string) => {
    const acao = acoes.find(a => a.id === acaoId);
    if (!acao) return;
    setSelectedAcao(acao);
    setLoadingEtapasModal(true);
    try {
      const { data, error } = await supabase.from("vw_etapas_detalhadas").select("*").eq("id_acao", acaoId);
      if (error) throw error;
      setEtapasModal(data || []);
    } catch (error) {
      toast.error("Erro ao carregar detalhes da ação.");
    } finally {
      setLoadingEtapasModal(false);
    }
  };

  const handleDoubleClick = (task: Task) => {
    const customTask = task as CustomTask;
    if (customTask.type === 'project' && customTask.original) {
      openAcaoModal(customTask.id);
    }
  };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Cronograma de Execução</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GanttIcon className="w-6 h-6" />
            Filtros e Visualização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar por ação ou etapa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
              <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Responsáveis</SelectItem>
                {responsaveis.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSetor} onValueChange={setFilterSetor}>
              <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Setores</SelectItem>
                {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {statusTipos.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Visualização:</span>
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ViewMode.Day}>Dia</SelectItem>
                  <SelectItem value={ViewMode.Week}>Semana</SelectItem>
                  <SelectItem value={ViewMode.Month}>Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleAll(false)}><ChevronUp className="w-4 h-4 mr-2" />Expandir Tudo</Button>
              <Button variant="outline" size="sm" onClick={() => toggleAll(true)}><ChevronDown className="w-4 h-4 mr-2" />Recolher Tudo</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-gray-500 py-10">Carregando cronograma…</p>
      ) : tasks.length === 0 ? (
        <p className="text-center text-gray-500 py-10">Nenhum item encontrado com os filtros atuais.</p>
      ) : (
        <div className="gantt-container border rounded-lg overflow-hidden">
          <Gantt
            tasks={tasks}
            viewMode={viewMode}
            onDateChange={handleDateChange}
            onRelationChange={handleRelationChange}
            onProgressChange={handleProgressChange}
            onDoubleClick={handleDoubleClick}
            onArrowDoubleClick={(fromTask, fromIndex, toTask, toIndex) => handleDependencyDelete(fromTask, fromIndex, toTask, toIndex)}
            TooltipContent={({ task }) => <CustomTooltipContent task={task as CustomTask} />}
          />
        </div>
      )}

      <DetalhesAcaoModal
        open={!!selectedAcao}
        onClose={() => setSelectedAcao(null)}
        acao={selectedAcao}
        etapas={etapasModal}
        loadingEtapas={loadingEtapasModal}
      />
    </div>
  )
}