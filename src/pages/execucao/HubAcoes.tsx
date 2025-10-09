import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

import ModalDetalhesAcao from '@/components/DetalhesAcaoModal';
import ModalCriarEditarAcao from '@/components/ModalCriarEditarAcao';
import ModalConfirmarExclusao from '@/components/ModalConfirmarExclusao';

import type { AcaoView, EtapaDetalhe, StatusAcaoTipo, Responsavel } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function HubAcoes() {
  const { user, role, responsavelId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // dados / seleção
  const [acoes, setAcoes] = useState<AcaoView[]>([]);
  const [selected, setSelected] = useState<AcaoView | null>(null);
  const [acaoParaEditar, setAcaoParaEditar] = useState<AcaoView | null>(null);
  const [acaoParaExcluir, setAcaoParaExcluir] = useState<AcaoView | null>(null);

  // etapas do modal de detalhes
  const [etapasDaAcao, setEtapasDaAcao] = useState<EtapaDetalhe[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEtapas, setLoadingEtapas] = useState(false);

  // Ler filtros da URL na montagem inicial
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  // filtros
  const [statusOptions, setStatusOptions] = useState<StatusAcaoTipo[]>([]);
  const [responsavelOptions, setResponsavelOptions] = useState<Responsavel[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>(queryParams.get('status') || '');
  const [responsavelFilter, setResponsavelFilter] = useState<string>(queryParams.get('responsavel') || '');
  const [searchQuery, setSearchQuery] = useState<string>(queryParams.get('q') || '');
  const [searchTerm, setSearchTerm] = useState<string>(queryParams.get('q') || ''); // debounced
  const [currentPage, setCurrentPage] = useState(Number(queryParams.get('page')) || 1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // modal criar/editar
  const [modalAcaoAberto, setModalAcaoAberto] = useState(false);

  // Atualiza a URL quando os filtros mudam
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (responsavelFilter) params.set('responsavel', responsavelFilter);
    if (searchTerm) params.set('q', searchTerm);
    if (currentPage > 1) params.set('page', String(currentPage));

    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [statusFilter, responsavelFilter, searchTerm, currentPage, navigate, location.pathname]);

  // debounce de busca
  const debouncer = useRef<number | null>(null);
  useEffect(() => {
    if (debouncer.current) window.clearTimeout(debouncer.current);
    debouncer.current = window.setTimeout(() => {
      if (searchQuery !== searchTerm) {
        setSearchTerm(searchQuery);
        setCurrentPage(1); // Resetar a página ao buscar
      }
    }, 300);
    return () => {
      if (debouncer.current) window.clearTimeout(debouncer.current);
    };
  }, [searchQuery, searchTerm]);

  async function fetchEtapas(acaoId: string): Promise<EtapaDetalhe[]> {
    const { data, error } = await supabase
      .from('vw_etapas_detalhadas')
      .select('*')
      .eq('id_acao', acaoId)
      .order('etapa_ordem', { ascending: true });

    if (error) {
      console.error('Erro ao buscar etapas:', error);
      return [];
    }
    return (data || []) as EtapaDetalhe[];
  }

  async function fetchAcoes() {
    // Só busca se o papel (role) estiver definido.
    if (!role) {
      // Ainda não está pronto para buscar, evita chamadas desnecessárias.
      return;
    }

    setLoading(true);

    let query = supabase.from('vw_acoes_detalhe').select('*, glosas_json:acoes_glosas(glosas:glosa_id(*)), operadoras_json:acoes_operadoras(operadoras:operadora_id(*))', { count: 'exact' });

    // REGRAS DE PERMISSÃO:
    // - admin/manager: veem tudo.
    // - user/viewer: veem apenas as ações pelas quais são responsáveis.
    if (role && !['admin', 'manager'].includes(role)) {
      // Se não houver um ID de responsável, não mostra nenhuma ação para evitar vazamento de dados.
      query = query.eq('id_responsavel', responsavelId || '00000000-0000-0000-0000-000000000000');
    }

    if (statusFilter) query = query.eq('id_status_acao', statusFilter);
    if (responsavelFilter) query = query.eq('id_responsavel', responsavelFilter);
    if (searchTerm) query = query.ilike('acao_descricao', `%${searchTerm}%`);

    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar ações:', error);
      toast.error('Não foi possível carregar as ações.');
      setAcoes([]);
      setTotalItems(0);
      setLoading(false);
      return;
    }

    // Ajuste na estrutura dos dados recebidos para corresponder ao que o componente espera
    const acoesFormatadas = data.map(acao => ({
      ...acao,
      glosas_json: acao.glosas_json.map((item: any) => item.glosas),
      operadoras_json: acao.operadoras_json.map((item: any) => item.operadoras),
    }));


    setAcoes(acoesFormatadas || []);
    setTotalItems(count || 0);
    setLoading(false);
  }

  async function excluirAcaoComEtapas() {
    if (!acaoParaExcluir) return;

    // Usaremos RPC para garantir que a exclusão seja atômica (tudo ou nada).
    // Isso é mais seguro do que fazer dois `await` separados no frontend.
    // Supondo que você crie uma função no Supabase chamada `deletar_acao_e_etapas`.
    const { error: etapasError } = await supabase
      .from('etapas')
      .delete()
      .eq('id_acao', acaoParaExcluir.id);

    if (etapasError) {
      console.error('Erro ao excluir etapas:', etapasError);
      toast.error('Erro ao excluir etapas vinculadas.', { description: etapasError.message });
      setAcaoParaExcluir(null);
      return;
    }

    // Se a exclusão das etapas deu certo, excluímos a ação
    const { error: acaoError } = await supabase
      .from('acoes')
      .delete()
      .eq('id', acaoParaExcluir.id);

    if (acaoError) {
      console.error(acaoError);
      toast.error('Erro ao excluir a ação.', { description: acaoError.message });
      setAcaoParaExcluir(null);
      return;
    }

    toast.success('Ação e etapas excluídas com sucesso!');
    setAcaoParaExcluir(null);

    // Se a ação excluída era a última da página, voltamos uma página
    if (acoes.length === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else {
      fetchAcoes(); // Recarrega os dados com os filtros atuais
    }
  }

  // opções de filtro (carrega quando sessão estiver pronta)
  useEffect(() => {
    if (!role) return;

    let cancelled = false;
    (async () => {
      let responsaveisQuery = supabase.from('responsaveis').select('*');
      // A busca de status não deve ser filtrada por organização, pois são tipos globais.
      let statusQuery = supabase.from('status_acao_tipos').select('*');

      const [{ data: responsavelData }, { data: statusData }] = await Promise.all([
        responsaveisQuery.order('nome', { ascending: true }),
        statusQuery.order('nome', { ascending: true }),
      ]);
      
      if (!cancelled && responsavelData) setResponsavelOptions(responsavelData as Responsavel[]);
      if (!cancelled && statusData) setStatusOptions(statusData as StatusAcaoTipo[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [role]);

  // carregar lista – apenas quando booted && user
  useEffect(() => {
    fetchAcoes();
  }, [user, role, responsavelId, statusFilter, responsavelFilter, searchTerm, currentPage]);

  // carregar etapas quando abrir detalhes
  useEffect(() => {
    let cancelled = false;
    if (selected) {
      setLoadingEtapas(true);
      fetchEtapas(selected.id).then((etapas) => {
        if (!cancelled) {
          setEtapasDaAcao(etapas);
          setLoadingEtapas(false);
        }
      });
    } else {
      setEtapasDaAcao([]);
    }
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const progressoMedio = useMemo(
    () =>
      acoes.length > 0
        ? acoes.reduce((s, a) => s + (a.progresso_percentual || 0), 0) / acoes.length
        : 0,
    [acoes]
  );

  const acoesConcluidasNaPagina = useMemo(
    () => acoes.filter((a) => a.nm_status_acao === 'Concluído').length,
    [acoes]
  );

  const acoesEmAberto = useMemo(
    () => Math.max(0, totalItems - acoesConcluidasNaPagina),
    [totalItems, acoesConcluidasNaPagina]
  );

  const renderStatusBadge = (status: string) => {
    let color = 'bg-gray-200 text-gray-800';
    switch (status) {
      case 'Concluído':
        color = 'bg-green-100 text-green-800';
        break;
      case 'Em Andamento':
        color = 'bg-blue-100 text-blue-800';
        break;
      case 'Em Atraso':
        color = 'bg-red-100 text-red-800';
        break;
      case 'Pendente':
        color = 'bg-yellow-100 text-yellow-800';
        break;
      case 'Não Iniciado':
        color = 'bg-gray-100 text-gray-800';
        break;
    }
    return <Badge className={color}>{status}</Badge>;
  };

  // O JSX do return permanece o mesmo
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">HUB Ações</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm text-gray-500">Ações em aberto</div>
            <div className="text-xl font-bold">{acoesEmAberto}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm text-gray-500">Ações a vencer</div>
            <div className="text-xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm text-gray-500">Progresso Médio</div>
            <div className="text-xl font-bold">{progressoMedio.toFixed(0)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm text-gray-500">Valor Impactado</div>
            <div className="text-xl font-bold">
              R${' '}
              {acoes
                .reduce((s, a) => s + (a.vl_impacto || 0), 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mt-6">
        <div className="flex gap-2">
          <Button variant="outline">Minhas ações</Button>
          <Button variant="default">Mapa de ações</Button>
        </div>
        <Button
          onClick={() => {
            setAcaoParaEditar(null);
            setModalAcaoAberto(true);
          }}
        >
          <Plus className="mr-2" size={16} /> Nova Ação
        </Button>
      </div>

      <div className="flex gap-4 mt-4">
        <Input
          placeholder="Buscar por ação..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value === 'all' ? '' : value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                {status.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={responsavelFilter}
          onValueChange={(value) => {
            setResponsavelFilter(value === 'all' ? '' : value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Responsáveis</SelectItem>
            {responsavelOptions.map((responsavel) => (
              <SelectItem key={responsavel.id} value={responsavel.id}>
                {responsavel.nome}
              </SelectItem>
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
              <th className="p-2">Glosas</th>
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
                <tr key={i}>
                  <td colSpan={10}>
                    <Skeleton className="h-10 w-full" />
                  </td>
                </tr>
              ))
            ) : (
              acoes.map((acao) => (
                <tr key={acao.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{acao.acao_descricao}</td>

                  <td className="p-2 text-center">{acao.nm_setor || 'Sem área'}</td>

                  <td className="p-2">
                    {acao.operadoras_json?.length ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {acao.operadoras_json.map((op) => (
                          <span
                            key={op.id}
                            className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                            title={op.nome}
                          >
                            {op.nome}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">Sem convênio</div>
                    )}
                  </td>

                  <td className="p-2">
                    {acao.glosas_json?.length ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {acao.glosas_json.slice(0, 3).map((g) => (
                          <span
                            key={g.id}
                            className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 border border-blue-200"
                            title={`${g.codigo} — ${g.descricao ?? ''}${g.ds_gru_fat ? ` (${g.ds_gru_fat})` : ''}`}
                          >
                            {g.codigo}
                          </span>
                        ))}

                        {acao.glosas_json.length > 3 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 border border-gray-200 hover:bg-gray-200"
                                title="Ver todas as glosas"
                              >
                                +{acao.glosas_json.length - 3}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-96 p-3">
                              <div className="max-h-72 overflow-y-auto pr-1">
                                <div className="text-sm font-medium mb-2">
                                  Glosas ({acao.glosas_json.length})
                                </div>
                                <ul className="space-y-1">
                                  {acao.glosas_json.map((g) => (
                                    <li key={g.id} className="text-xs">
                                      <span className="font-semibold">{g.codigo}</span>
                                      {g.descricao ? ` — ${g.descricao}` : ''}
                                      {g.ds_gru_fat ? (
                                        <span className="opacity-70">{` (${g.ds_gru_fat})`}</span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">Sem glosa</div>
                    )}
                  </td>

                  <td className="p-2 text-center">
                    {acao.dt_termino_acao
                      ? new Date(acao.dt_termino_acao).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>

                  <td className="p-2 text-center">{acao.nm_responsavel || 'Sem responsável'}</td>

                  <td className="p-2 text-center">
                    {renderStatusBadge(acao.nm_status_acao || 'Sem status')}
                  </td>

                  <td className="p-2 text-center">
                    <Progress value={acao.progresso_percentual || 0} className="h-2" />
                    <div className="text-xs mt-1">
                      {(acao.etapas_concluidas ?? 0)} de {(acao.total_etapas ?? 0)} etapas concluídas (
                      {acao.progresso_percentual || 0}%)
                    </div>
                  </td>

                  <td className="p-2 text-center">
                    R{' '}
                    {(acao.vl_impacto || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </td>

                  <td className="p-2 flex gap-2 justify-center">
                    <Button size="icon" variant="ghost" onClick={() => setSelected(acao)}>
                      <Eye size={16} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setAcaoParaEditar(acao);
                        setModalAcaoAberto(true);
                      }}
                    >
                      <Pencil size={16} />
                    </Button>

                    <Button size="icon" variant="ghost" onClick={() => setAcaoParaExcluir(acao)}>
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
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <div className="mx-4 text-sm">
            Página {currentPage} de {Math.ceil(totalItems / itemsPerPage) || 1}
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={currentPage * itemsPerPage >= totalItems}
          >
            Próximo
          </Button>
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
        onConfirm={() => {
          excluirAcaoComEtapas();
        }}
      />
    </div>
  );
}
