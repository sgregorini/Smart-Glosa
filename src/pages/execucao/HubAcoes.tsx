import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Eye, Trash2, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent } from '@/components/ui/pagination';
import ModalDetalhesAcao from '@/components/DetalhesAcaoModal';
import ModalCriarEditarAcao from '@/components/ModalCriarEditarAcao';
import ModalConfirmarExclusao from '@/components/ModalConfirmarExclusao'


interface StatusAcao {
  nome: string;
  id: string;
}


interface Responsavel {
  nome: string;
  id: string;
  email: string;
  id_setor: string;
}


interface Acao {
  id: string;
  pda_id_original: string;
  nm_filial: string;
  acao_descricao: string;
  causa_raiz: string;
  vl_impacto: number;
  mes_referencia: string;
  dt_inicio_acao: string;
  dt_termino_acao: string;
  observacoes: string;
  created_at: string;
  updated_at: string;
  id_status_acao: string;
  id_setor_responsavel: string;
  id_responsavel: string;
  id_operadora: string;
  id_glosa: string;

  nm_responsavel: string;
  nm_setor_responsavel: string;
  cd_glosa: string;
  ds_gru_fat_glosa: string;
  nm_status_acao: string;
  nm_operadora: string;
  total_etapas: number;
  etapas_concluidas: number;
  progresso_percentual: number;
}

interface Etapa {
  id: string;
  id_acao: string;
  etapa_descricao: string;
  etapa_ordem: number;
  porcentagem_conclusao_etapa: number;
  dt_inicio_etapa: string;
  dt_termino_etapa: string;
  id_status_etapa: string;
  id_responsavel: string;

  nm_responsavel: string;
  nm_status_etapa: string;
  created_at: string;
  updated_at: string;
}


export default function HubAcoes() {
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [loading, setLoading] = useState(false); // 👈 este aqui
  const [loadingEtapas, setLoadingEtapas] = useState(false);
  const [selected, setSelected] = useState<Acao | null>(null);
  const [etapasDaAcao, setEtapasDaAcao] = useState<Etapa[]>([]);


  const [statusOptions, setStatusOptions] = useState<StatusAcao[]>([]);
  const [responsavelOptions, setResponsavelOptions] = useState<Responsavel[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [responsavelFilter, setResponsavelFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const [modalAcaoAberto, setModalAcaoAberto] = useState(false)
  const [acaoParaEditar, setAcaoParaEditar] = useState<Acao | null>(null)

  const [acaoParaExcluir, setAcaoParaExcluir] = useState<Acao | null>(null)

  async function fetchEtapas(acaoId: string): Promise<Etapa[]> {
    const { data, error } = await supabase
      .from('vw_etapas_detalhadas')
      .select('*')
      .eq('id_acao', acaoId)
      .order('etapa_ordem', { ascending: true });

    if (error) {
      console.error('Erro ao buscar etapas:', error);
      return [];
    }

    return data as Etapa[] || [];
  }
  

  async function fetchAcoes() {
    setLoading(true);

    let query = supabase
      .from('vw_acoes_detalhadas')
      .select('*', { count: 'exact' });

    if (statusFilter) query = query.eq('id_status_acao', statusFilter);
    if (responsavelFilter) query = query.eq('id_responsavel', responsavelFilter);
    if (searchQuery) query = query.ilike('acao_descricao', `%${searchQuery}%`);

    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) {
      console.error('Erro ao buscar ações:', error);
      toast.error('Erro ao carregar as ações.');
    } else if (data) {
      setAcoes(data as Acao[]);
      setTotalItems(count || 0);
    }

    setLoading(false);
  }

  async function excluirAcaoComEtapas() {
  if (!acaoParaExcluir) return

  // Deleta as etapas primeiro
  const { error: etapasError } = await supabase
    .from('etapas')
    .delete()
    .eq('id_acao', acaoParaExcluir.id)

  if (etapasError) {
    console.error(etapasError)
    toast.error('Erro ao excluir etapas vinculadas.')
    return
  }

  // Depois deleta a ação
  const { error: acaoError } = await supabase
    .from('acoes')
    .delete()
    .eq('id', acaoParaExcluir.id)

  if (acaoError) {
    console.error(acaoError)
    toast.error('Erro ao excluir a ação.')
    return
  }

  toast.success('Ação e etapas excluídas com sucesso!')
  fetchAcoes()
}


  useEffect(() => {
    async function fetchFilterOptions() {
      const { data: statusData } = await supabase.from('status_acao_tipos').select('*');
      if (statusData) setStatusOptions(statusData);
      const { data: responsavelData } = await supabase.from('responsaveis').select('*');
      if (responsavelData) setResponsavelOptions(responsavelData);
    }
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchAcoes();
  }, [statusFilter, responsavelFilter, searchQuery, currentPage]);

useEffect(() => {
  if (selected) {
    setLoadingEtapas(true);
    fetchEtapas(selected.id).then(etapas => {
      setEtapasDaAcao(etapas);
      setLoadingEtapas(false);
    });
  } else {
    setEtapasDaAcao([]);
  }
}, [selected]);

  const progressoMedio = acoes.length
  ? acoes.reduce((s, a) => s + (a.progresso_percentual || 0), 0) / acoes.length
  : 0;
  const acoesEmAberto = totalItems - acoes.filter(a => a.nm_status_acao === 'Concluído').length;


  const renderStatusBadge = (status: string) => {
    let color = 'bg-gray-200 text-gray-800';
    switch (status) {
      case 'Concluído': color = 'bg-green-100 text-green-800'; break;
      case 'Em Andamento': color = 'bg-blue-100 text-blue-800'; break;
      case 'Em Atraso': color = 'bg-red-100 text-red-800'; break;
      case 'Pendente': color = 'bg-yellow-100 text-yellow-800'; break;
      case 'Não Iniciado': color = 'bg-gray-100 text-gray-800'; break;
    }
    return <Badge className={color}>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">HUB Ações</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><div className="text-sm text-gray-500">Ações em aberto</div><div className="text-xl font-bold">{acoesEmAberto}</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-sm text-gray-500">Ações a vencer</div><div className="text-xl font-bold">0</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-sm text-gray-500">Progresso Médio</div><div className="text-xl font-bold">{progressoMedio.toFixed(0)}%</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-sm text-gray-500">Valor Impactado</div><div className="text-xl font-bold">R$ {acoes.reduce((s, a) => s + (a.vl_impacto || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div></CardContent></Card>
      </div>

      <div className="flex justify-between items-center mt-6">
        <div className="flex gap-2">
          <Button variant="outline">Minhas ações</Button>
          <Button variant="default">Mapa de ações</Button>
        </div>
        <Button onClick={() => {
          setAcaoParaEditar(null)
          setModalAcaoAberto(true)
        }}>
          <Plus className="mr-2" size={16} /> Nova Ação
        </Button>

      </div>

      <div className="flex gap-4 mt-4">
        <Input
          placeholder="Buscar por ação..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {statusOptions.map(status => (
              <SelectItem key={status.id} value={status.id}>{status.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={responsavelFilter} onValueChange={(value) => setResponsavelFilter(value === 'all' ? '' : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Responsáveis</SelectItem>
            {responsavelOptions.map(responsavel => (
              <SelectItem key={responsavel.id} value={responsavel.id}>{responsavel.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto border rounded mt-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Plano de Ação</th>
              <th className="p-2">Área</th>
              <th className="p-2">Convênio</th>
              <th className="p-2">Prazo</th>
              <th className="p-2">Responsável</th>
              <th className="p-2">Status</th>
              <th className="p-2">Progresso</th>
              <th className="p-2">Valor Impactado</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(itemsPerPage)].map((_, i) => (
                <tr key={i}><td colSpan={9}><Skeleton className="h-10 w-full" /></td></tr>
              ))
            ) : (
              acoes.map(acao => (
                <tr key={acao.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{acao.acao_descricao}</td>
                  <td className="p-2 text-center">{acao.nm_setor_responsavel || 'Sem área'}</td>
                  <td className="p-2 text-center">{acao.nm_operadora || 'Sem convênio'}</td>
                  <td className="p-2 text-center">{acao.dt_termino_acao ? new Date(acao.dt_termino_acao).toLocaleDateString() : '-'}</td>
                  <td className="p-2 text-center">{acao.nm_responsavel || 'Sem responsável'}</td>
                  <td className="p-2 text-center">{renderStatusBadge(acao.nm_status_acao || 'Sem status')}</td>
                  <td className="p-2 text-center">
                    <Progress value={acao.progresso_percentual || 0} className="h-2" />
                      <div className="text-xs mt-1">{acao.etapas_concluidas} de {acao.total_etapas} etapas concluídas ({acao.progresso_percentual || 0}%)</div>
                  </td>
                  <td className="p-2 text-center">R$ {(acao.vl_impacto || 0).toLocaleString('pt-BR')}</td>
                  <td className="p-2 flex gap-2 justify-center">
                    <Button size="icon" variant="ghost" onClick={() => setSelected(acao)}><Eye size={16} /></Button>
                    <Button size="icon"
                      variant="ghost"
                      onClick={() => {
                        setAcaoParaEditar(acao)
                        setModalAcaoAberto(true)
                      }}
                    >
                      <Pencil size={16} />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setAcaoParaExcluir(acao)}
                    >
                      <Trash2 size={16} />
                    </Button>

                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination>
        <PaginationContent>
          <Button variant="outline" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
          <div className="mx-4 text-sm">Página {currentPage} de {Math.ceil(totalItems / itemsPerPage)}</div>
          <Button variant="outline" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage * itemsPerPage >= totalItems}>Próximo</Button>
        </PaginationContent>
      </Pagination>

      <ModalDetalhesAcao
        open={!!selected}
        onClose={() => setSelected(null)}
        acao={selected}
        etapas={etapasDaAcao}
        loadingEtapas={loadingEtapas} 
        />

      <ModalCriarEditarAcao
        open={modalAcaoAberto}
        onClose={() => setModalAcaoAberto(false)}
        acao={acaoParaEditar}
        onSave={fetchAcoes}
      />

      <ModalConfirmarExclusao
        open={!!acaoParaExcluir}
        onClose={() => setAcaoParaExcluir(null)}
        onConfirm={excluirAcaoComEtapas}
      />

    </div>
  );
}
