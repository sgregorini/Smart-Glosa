import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Responsavel, AcaoDetalhe, EtapaDetalhe } from '@/types'
import ProgressoEtapas from '@/components/ProgressoEtapas'
import ModalConfirmarStatus from '@/components/ModalConfirmarStatus'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  FilePlus2,
  MessageCircle,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Play,
  Check,
  X,
  RotateCcw,
} from 'lucide-react'
import ModalAdicionarEtapa from './ModalAdicionarEtapa'
import ComentariosEtapa from './ComentariosEtapa'
import AnexosEtapa from './AnexosEtapa'

export interface DetalhesAcaoModalProps {
  open: boolean
  onClose: () => void
  acao: AcaoDetalhe | null           // <- usa a view (nm_status_acao, nm_responsavel)
  etapas: EtapaDetalhe[]             // <- usa a view (nm_status_etapa, nm_responsavel)
  loadingEtapas: boolean
}

/** Tipo genérico p/ editor multi-seleção */
type GenericOption = { id: string; label: string; sublabel?: string }

function getIcon(from: string, to: string) {
  if (from === 'Pendente' && to === 'Em Andamento') return <Play className="text-yellow-500 w-4 h-4" />
  if (to === 'Concluído') return <Check className="text-green-600 w-4 h-4" />
  if (from === 'Concluído' && to === 'Em Andamento') return <RotateCcw className="text-blue-500 w-4 h-4" />
  return null
}

/** Editor Multi-Select com busca, usado para Operadoras e Glosas */
function MultiSelectEditor({
  title,
  options,
  selected,
  setSelected,
  placeholder = 'Pesquisar…',
  renderOption,
}: {
  title: string
  options: GenericOption[]
  selected: string[]
  setSelected: (ids: string[]) => void
  placeholder?: string
  renderOption?: (o: GenericOption) => React.ReactNode
}) {
  const [query, setQuery] = useState('')

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(q))
    )
  }, [options, query])

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      setSelected(selected.filter((s) => s !== id))
    } else {
      setSelected([...selected, id])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{title}</h4>
        {selected.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            Limpar
          </Button>
        )}
      </div>

      <Input
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="max-h-56 overflow-y-auto rounded-md border">
        {filtered.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">Nenhum item encontrado.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((o) => {
              const checked = selectedSet.has(o.id)
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => toggle(o.id)}
                    className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground flex items-start gap-2"
                  >
                    <span
                      className={`mt-0.5 inline-block h-4 w-4 rounded-sm border ${
                        checked ? 'bg-primary' : 'bg-background'
                      }`}
                    />
                    <div className="flex flex-col">
                      {renderOption ? (
                        renderOption(o)
                      ) : (
                        <>
                          <span className="text-sm">{o.label}</span>
                          {o.sublabel && (
                            <span className="text-xs opacity-70">{o.sublabel}</span>
                          )}
                        </>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function DetalhesAcaoModal({
  open,
  onClose,
  acao,
  etapas,
  loadingEtapas,
}: DetalhesAcaoModalProps) {
  if (!acao) return null

  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [abrirModalEtapa, setAbrirModalEtapa] = useState(false)
  const [etapasInternas, setEtapasInternas] = useState<EtapaDetalhe[]>(etapas)
  const [modalStatus, setModalStatus] = useState<{
    etapaId: string
    tipo: 'andamento' | 'concluido' | 'reabrir'
  } | null>(null)

  const [historico, setHistorico] = useState<any[]>([])

  // === Status lookup dinâmico (sem UUID hardcoded) ===
  const [statusMap, setStatusMap] = useState<Record<'andamento' | 'concluido' | 'pendente', string>>({
    andamento: '',
    concluido: '',
    pendente: '',
  })

  // === Relações N:N da Ação ===
  const [operadorasOptions, setOperadorasOptions] = useState<GenericOption[]>([])
  const [glosasOptions, setGlosasOptions] = useState<GenericOption[]>([])
  const [operadoraIds, setOperadoraIds] = useState<string[]>([])
  const [glosaIds, setGlosaIds] = useState<string[]>([])
  const [editandoVinculos, setEditandoVinculos] = useState(false)
  const [salvandoVinculos, setSalvandoVinculos] = useState(false)

  useEffect(() => {
    supabase.from('responsaveis').select('*').then(({ data }) => {
      if (data) setResponsaveis(data)
    })
  }, [])

  useEffect(() => {
    setEtapasInternas(etapas)
    if (acao?.id) {
      fetchHistorico(acao.id).then(setHistorico)
    }
  }, [etapas, acao?.id])

  // Carrega status IDs por nome (Pendente, Em Andamento, Concluído)
  useEffect(() => {
    async function loadStatusIds() {
      const { data, error } = await supabase
        .from('status_etapa_tipos')
        .select('id, nome')

      if (error || !data) return
      const map: any = {}
      for (const row of data) {
        const nome = (row.nome || '').toLowerCase()
        if (nome.includes('andamento')) map.andamento = row.id
        else if (nome.includes('conclu')) map.concluido = row.id
        else if (nome.includes('pendente')) map.pendente = row.id
      }
      setStatusMap((prev) => ({ ...prev, ...map }))
    }
    if (open) loadStatusIds()
  }, [open])

  // Carrega opções de Operadoras e Glosas + vínculos da ação
  useEffect(() => {
    async function loadOptionsESelections() {
      const [ops, gls] = await Promise.all([
        supabase.from('operadoras').select('id, nome'),
        supabase.from('glosas').select('id, codigo, descricao, ds_gru_fat'),
      ])

      if (ops.data) {
        setOperadorasOptions(
          ops.data.map((o) => ({ id: o.id, label: o.nome }))
        )
      }
      if (gls.data) {
        setGlosasOptions(
          gls.data.map((g) => ({
            id: g.id,
            label: `${g.codigo} — ${g.descricao}`,
            sublabel: g.ds_gru_fat || undefined,
          }))
        )
      }

      if (acao?.id) {
        const [selOps, selGls] = await Promise.all([
          supabase.from('acoes_operadoras').select('operadora_id').eq('acao_id', acao.id),
          supabase.from('acoes_glosas').select('glosa_id').eq('acao_id', acao.id),
        ])

        if (selOps.data) setOperadoraIds(selOps.data.map((r: any) => r.operadora_id))
        if (selGls.data) setGlosaIds(selGls.data.map((r: any) => r.glosa_id))
      } else {
        setOperadoraIds([])
        setGlosaIds([])
      }
    }
    if (open) loadOptionsESelections()
  }, [open, acao?.id])

  async function fetchEtapas(idAcao: string) {
    const { data, error } = await supabase
      .from('vw_etapas_detalhadas')  // <- usa a view com nm_status_etapa e nm_responsavel
      .select('*')
      .eq('id_acao', idAcao)
      .order('etapa_ordem', { ascending: true })

    if (error) {
      console.error(error)
      return []
    }
    return (data || []) as EtapaDetalhe[]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Concluído':
        return 'bg-green-500 text-white'
      case 'Em Atraso':
        return 'bg-red-500 text-white'
      case 'Em Andamento':
        return 'bg-yellow-500 text-black'
      case 'Pendente':
        return 'bg-gray-400 text-white'
      default:
        return 'bg-gray-200 text-gray-800'
    }
  }

  function verificarStatusVisual(et: EtapaDetalhe): string {
    const nome = et.nm_status_etapa || 'Pendente'
    if (
      nome !== 'Concluído' &&
      et.dt_termino_etapa &&
      new Date(et.dt_termino_etapa) < new Date()
    ) {
      return 'Em Atraso'
    }
    return nome
  }

  function formatarIntervalo(interval: string) {
    if (!interval || typeof interval !== 'string') return ''
    const clean = interval.replace('-', '')
    const matchDias = clean.match(/(\d+)\s+day(?:s)?\s+(\d{2}):(\d{2}):/)
    if (matchDias) {
      const dias = parseInt(matchDias[1], 10)
      const horas = parseInt(matchDias[2], 10)
      const minutos = parseInt(matchDias[3], 10)
      return `${dias}d ${horas}h ${minutos}min`
    }
    const matchTempo = clean.match(/(\d{2}):(\d{2}):/)
    if (matchTempo) {
      const horas = parseInt(matchTempo[1], 10)
      const minutos = parseInt(matchTempo[2], 10)
      let texto = ''
      if (horas > 0) texto += `${horas}h `
      if (minutos > 0) texto += `${minutos}min`
      return texto.trim() || 'menos de 1min'
    }
    return 'menos de 1min'
  }

  async function fetchHistorico(acaoId: string) {
    const { data: etapasData, error: etapasError } = await supabase
      .from('etapas')
      .select('id')
      .eq('id_acao', acaoId)

    if (etapasError || !etapasData) {
      console.error(etapasError)
      return []
    }

    const etapaIds = etapasData.map(e => e.id)
    if (etapaIds.length === 0) return []

    const { data: historicoData, error: historicoError } = await supabase
      .from('vw_etapas_historico')
      .select('*')
      .in('etapa_id', etapaIds)
      .order('criado_em', { ascending: false })

    if (historicoError) {
      console.error(historicoError)
      return []
    }

    return historicoData || []
  }

  async function atualizarStatus(
    etapaId: string,
    novoStatus: 'andamento' | 'concluido' | 'pendente' | 'reabrir'
  ) {
    const final = novoStatus === 'reabrir' ? 'andamento' : novoStatus
    const statusId = statusMap[final]
    if (!statusId) {
      alert('Não foi possível identificar o status no banco (status_etapa_tipos).')
      return
    }

    const hoje = new Date().toISOString().slice(0, 10)

    // Busca status atual
    const { data: etapa, error: fetchError } = await supabase
      .from('etapas')
      .select('id_status_etapa')
      .eq('id', etapaId)
      .single()

    if (fetchError || !etapa) {
      console.error(fetchError)
      alert('Erro ao obter etapa atual.')
      return
    }

    const campos: Record<string, any> = { id_status_etapa: statusId }
    if (final === 'andamento') campos.dt_inicio_real = hoje
    if (final === 'concluido') campos.dt_fim_real = hoje

    const { error: updateError } = await supabase
      .from('etapas')
      .update(campos)
      .eq('id', etapaId)

    if (updateError) {
      console.error(updateError)
      alert('Erro ao atualizar status da etapa.')
      return
    }

    // Histórico
    const usuarioId = localStorage.getItem('usuario_id')
    const { error: logError } = await supabase
      .from('etapas_historico')
      .insert({
        etapa_id: etapaId,
        status_anterior: etapa.id_status_etapa,
        status_novo: statusId,
        criado_por: usuarioId || null,
      })

    if (logError) {
      console.error(logError)
      alert('Status alterado, mas houve erro ao salvar histórico.')
    }

    // Atualiza UI
    if (acao?.id) {
      const atualizadas = await fetchEtapas(acao.id)
      setEtapasInternas(atualizadas)
    }
  }

  // Utils N:N
  async function syncManyToMany(params: {
    acaoId: string
    table: 'acoes_glosas' | 'acoes_operadoras'
    idColumn: 'glosa_id' | 'operadora_id'
    selectedIds: string[]
  }) {
    const { acaoId, table, idColumn, selectedIds } = params
    const current = await supabase.from(table).select(idColumn).eq('acao_id', acaoId)
    if (current.error) throw current.error
    const currentIds = new Set<string>((current.data || []).map((r: any) => r[idColumn]))
    const selSet = new Set(selectedIds)
    const toInsert = [...selSet].filter((id) => !currentIds.has(id))
    const toDelete = [...currentIds].filter((id) => !selSet.has(id))

    if (toInsert.length > 0) {
      const rows = toInsert.map((id) => ({ acao_id: acaoId, [idColumn]: id }))
      const ins = await supabase.from(table).insert(rows)
      if (ins.error) throw ins.error
    }
    if (toDelete.length > 0) {
      const del = await supabase.from(table)
        .delete()
        .eq('acao_id', acaoId)
        .in(idColumn, toDelete)
      if (del.error) throw del.error
    }
  }

  async function salvarVinculos() {
    if (!acao?.id) return
    try {
      setSalvandoVinculos(true)
      await Promise.all([
        syncManyToMany({
          acaoId: acao.id,
          table: 'acoes_operadoras',
          idColumn: 'operadora_id',
          selectedIds: operadoraIds,
        }),
        syncManyToMany({
          acaoId: acao.id,
          table: 'acoes_glosas',
          idColumn: 'glosa_id',
          selectedIds: glosaIds,
        }),
      ])
      setEditandoVinculos(false)
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar vínculos.')
    } finally {
      setSalvandoVinculos(false)
    }
  }

  const operadorasSelecionadas = useMemo(() => {
    const set = new Set(operadoraIds)
    return operadorasOptions.filter((o) => set.has(o.id))
  }, [operadoraIds, operadorasOptions])

  const glosasSelecionadas = useMemo(() => {
    const set = new Set(glosaIds)
    return glosasOptions.filter((g) => set.has(g.id))
  }, [glosaIds, glosasOptions])

  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl font-bold">Detalhes da Ação</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Aqui você vê todas as informações, gerencia vínculos (Operadoras/Glosas) e pode adicionar etapas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[340px_1fr] h-[80vh]">
          {/* Painel esquerdo */}
          <div className="bg-gray-50 p-6 border-r space-y-5 w-full h-full overflow-y-auto">
            {/* Título + fechar */}
            <div className="flex justify-between items-start">
              <div className="max-w-[280px]">
                <h2 className="text-base font-bold break-words">{acao.acao_descricao}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X size={20} />
              </Button>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground mb-1">Status</label>
              <div>
                <Badge className={getStatusBadge(acao.nm_status_acao || 'Pendente')}>
                  {acao.nm_status_acao || 'Pendente'}
                </Badge>
              </div>
            </div>

            {/* Responsável */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground mb-1">Responsável</label>
              <p className="text-sm font-medium text-gray-800">{acao.nm_responsavel || 'Não definido'}</p>
            </div>

            {/* Operadoras vinculadas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Operadoras vinculadas</label>
                <Button variant="ghost" size="sm" onClick={() => setEditandoVinculos(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {operadorasSelecionadas.length === 0 ? (
                  <span className="text-xs opacity-60">Nenhuma operadora vinculada.</span>
                ) : (
                  operadorasSelecionadas.map((o) => (
                    <span key={o.id} className="text-xs rounded-full border px-2 py-0.5 bg-white">
                      {o.label}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Motivos de Glosa vinculados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Motivos de Glosa vinculados</label>
                <Button variant="ghost" size="sm" onClick={() => setEditandoVinculos(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {glosasSelecionadas.length === 0 ? (
                  <span className="text-xs opacity-60">Nenhum motivo de glosa vinculado.</span>
                ) : (
                  glosasSelecionadas.map((g) => (
                    <span key={g.id} className="text-xs rounded-full border px-2 py-0.5 bg-white">
                      {g.label}{g.sublabel ? ` (${g.sublabel})` : ''}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Painel direito */}
          <div className="p-6 overflow-y-auto">
            <Tabs defaultValue="etapas" className="w-full">
              <TabsList className="grid grid-cols-4 mb-4 bg-gray-100">
                <TabsTrigger value="etapas">
                  <CheckCircle2 className="mr-2" /> Etapas
                </TabsTrigger>
                <TabsTrigger value="anexos">
                  <FilePlus2 className="mr-2" /> Anexos
                </TabsTrigger>
                <TabsTrigger value="comentarios">
                  <MessageCircle className="mr-2" /> Comentários
                </TabsTrigger>
                <TabsTrigger value="historico">
                  <Clock className="mr-2" /> Histórico
                </TabsTrigger>
              </TabsList>

              <TabsContent value="etapas">
                <ProgressoEtapas etapas={etapasInternas as any} />
                <div className="flex justify-between mb-2 mt-4">
                  <h3 className="text-lg font-semibold">Etapas da Ação</h3>
                  <Button variant="outline" onClick={() => setAbrirModalEtapa(true)}>
                    <Plus className="mr-2" /> Adicionar Etapa
                  </Button>
                </div>

                <div className="space-y-4">
                  {loadingEtapas ? (
                    <p>Carregando etapas…</p>
                  ) : etapasInternas.length === 0 ? (
                    <p>Nenhuma etapa cadastrada.</p>
                  ) : (
                    etapasInternas.map(et => {
                      const statusVisual = verificarStatusVisual(et)
                      return (
                        <Card key={et.id} className="shadow-sm">
                          <CardContent className="flex items-center p-4 gap-4">
                            <div className="min-w-0">
                              <h4 className="font-medium break-words">
                                {et.etapa_descricao}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Responsável: {et.nm_responsavel || '–'}
                              </p>
                            </div>

                            <div className="flex items-center ml-auto space-x-2">
                              <Badge className={getStatusBadge(statusVisual)}>
                                {statusVisual}
                              </Badge>

                              {et.nm_status_etapa === 'Pendente' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Iniciar etapa"
                                  onClick={() => setModalStatus({ etapaId: et.id, tipo: 'andamento' })}
                                >
                                  <Play size={16} />
                                </Button>
                              )}

                              {et.nm_status_etapa === 'Em Andamento' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Concluir etapa"
                                  onClick={() => atualizarStatus(et.id, 'concluido')}
                                >
                                  <Check size={16} />
                                </Button>
                              )}

                              {et.nm_status_etapa === 'Concluído' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Reabrir etapa"
                                  onClick={() => setModalStatus({ etapaId: et.id, tipo: 'reabrir' })}
                                >
                                  <X size={16} />
                                </Button>
                              )}

                              <Button variant="ghost" size="icon" title="Editar">
                                <Pencil size={16} />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="anexos">
                {etapasInternas.map((et) => (
                  <div key={et.id} className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">{et.etapa_descricao}</h4>
                    <AnexosEtapa etapaId={et.id} />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="comentarios">
                {etapasInternas.map(et => (
                  <div key={et.id} className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">{et.etapa_descricao}</h4>
                    <ComentariosEtapa etapaId={et.id} />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="historico">
                <div className="max-h-[65vh] overflow-y-auto pr-2">
                  <h3 className="text-lg font-semibold mb-4">Histórico de Status</h3>
                  {historico.length === 0 ? (
                    <p>Nenhuma movimentação registrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {historico.map((h, i) => (
                        <Card key={i} className="p-4 flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            {getIcon(h.status_anterior_nome, h.status_novo_nome)}
                            <p className="text-sm text-muted-foreground">
                              <strong>{h.nm_etapa}</strong> foi alterada de{' '}
                              <span className="font-medium">{h.status_anterior_nome || '–'}</span> para{' '}
                              <span className="font-medium">{h.status_novo_nome || '–'}</span> em{' '}
                              {new Date(h.criado_em).toLocaleDateString('pt-BR')}
                              {h.criado_por_nome ? ` por ${h.criado_por_nome}` : ''}
                            </p>
                          </div>

                          {h.tempo_em_status && (
                            <span className="text-xs text-muted-foreground pl-7 italic">
                              Tempo nesse status: {formatarIntervalo(h.tempo_em_status)}
                            </span>
                          )}

                          {h.responsavel_etapa && (
                            <span className="text-xs text-muted-foreground pl-7">
                              Responsável: {h.responsavel_etapa}
                            </span>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>

      {/* Modal Adicionar Etapa */}
      <ModalAdicionarEtapa
        open={abrirModalEtapa}
        onClose={() => setAbrirModalEtapa(false)}
        idAcao={acao.id}
        responsaveis={responsaveis}
        onEtapaAdicionada={async () => {
          const novas = await fetchEtapas(acao.id)
          setEtapasInternas(novas)
        }}
      />

      {/* Confirmação de mudança de status */}
      {modalStatus && (
        <ModalConfirmarStatus
          open={true}
          tipo={modalStatus.tipo}
          onClose={() => setModalStatus(null)}
          onConfirm={() => atualizarStatus(modalStatus.etapaId, modalStatus.tipo)}
        />
      )}

      {/* Mini-editor de vínculos Operadoras/Glosas */}
      {editandoVinculos && (
        <Dialog open={editandoVinculos} onOpenChange={(isOpen) => !isOpen && setEditandoVinculos(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar vínculos da Ação</DialogTitle>
              <DialogDescription>Selecione as Operadoras e Motivos de Glosa relacionados a esta ação.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MultiSelectEditor
                title="Operadoras"
                options={operadorasOptions}
                selected={operadoraIds}
                setSelected={setOperadoraIds}
                placeholder="Buscar operadora…"
              />
              <MultiSelectEditor
                title="Motivos de Glosa"
                options={glosasOptions}
                selected={glosaIds}
                setSelected={setGlosaIds}
                placeholder="Buscar por código/descrição…"
                renderOption={(o) => (
                  <>
                    <span className="text-sm">{o.label}</span>
                    {o.sublabel && <span className="text-xs opacity-70">{o.sublabel}</span>}
                  </>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditandoVinculos(false)}>Cancelar</Button>
              <Button onClick={salvarVinculos} disabled={salvandoVinculos}>
                {salvandoVinculos ? 'Salvando…' : 'Salvar vínculos'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}
