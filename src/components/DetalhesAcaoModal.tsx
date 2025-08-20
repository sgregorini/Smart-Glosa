import { useState, useEffect } from 'react'
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

export default function DetalhesAcaoModal({
  open,
  onClose,
  acao,
  etapas,
  loadingEtapas,
}: DetalhesAcaoModalProps) {
  if (!acao) return null

  const getIcon = (from: string, to: string) => {
    if (from === 'Pendente' && to === 'Em Andamento') return <Play className="text-yellow-500 w-4 h-4" />
    if (to === 'Concluído') return <Check className="text-green-600 w-4 h-4" />
    if (from === 'Concluído' && to === 'Em Andamento') return <RotateCcw className="text-blue-500 w-4 h-4" />
    return null
  }

  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [abrirModalEtapa, setAbrirModalEtapa] = useState(false)
  const [etapasInternas, setEtapasInternas] = useState<EtapaDetalhe[]>(etapas)
  const [modalStatus, setModalStatus] = useState<{
    etapaId: string
    tipo: 'andamento' | 'concluido' | 'reabrir'
  } | null>(null)

  const [historico, setHistorico] = useState<any[]>([])

  // ATENÇÃO: confere se esses UUIDs batem com sua tabela status_etapa_tipos
  const STATUS: Record<'andamento' | 'concluido' | 'pendente', string> = {
    andamento: '1d0abec2-697e-4c0b-aee5-5259b663858f',
    concluido: '804c998e-cbc0-487c-aeac-5adcf4b10e46',
    pendente: 'f5e906c02-ce9f-456f-9c44-5fa081539f90', // parece ter um "02" a mais; valida!
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
    // Usa nome do status vindo da VIEW
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

  async function fetchHistorico(acaoId: string) {
    // busca as etapas da ação
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

    // sua view vw_etapas_historico não aparece na lista, mas você disse que existe/funciona
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
    const statusFinal = novoStatus === 'reabrir' ? 'andamento' : novoStatus
    const novoStatusId = STATUS[statusFinal]
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

    const campos: Record<string, any> = { id_status_etapa: novoStatusId }
    if (statusFinal === 'andamento') campos.dt_inicio_real = hoje
    if (statusFinal === 'concluido') campos.dt_fim_real = hoje

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
        status_novo: novoStatusId,
        criado_por: usuarioId || null, // na sua tabela é text; se quiser uuid, altere o tipo
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

  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl font-bold">Detalhes da Ação</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Aqui você vê todas as informações e pode adicionar etapas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[320px_1fr] h-[80vh]">
          {/* Painel esquerdo */}
          <div className="bg-gray-50 p-6 border-r space-y-4 w-full h-full">
            <div className="flex justify-between items-start">
              <div className="max-w-[260px]">
                <h2 className="text-base font-bold break-words">{acao.acao_descricao}</h2>
                <p className="text-xs text-muted-foreground">
                  {acao.pda_id_original || '—'} • {acao.id_operadora || '–'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X size={20} />
              </Button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground mb-1">Status</label>
              <div>
                <Badge className={getStatusBadge(acao.nm_status_acao || 'Pendente')}>
                  {acao.nm_status_acao || 'Pendente'}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground mb-1">Responsável</label>
              <p className="text-sm font-medium text-gray-800">{acao.nm_responsavel || 'Não definido'}</p>
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

      {modalStatus && (
        <ModalConfirmarStatus
          open={true}
          tipo={modalStatus.tipo}
          onClose={() => setModalStatus(null)}
          onConfirm={() => atualizarStatus(modalStatus.etapaId, modalStatus.tipo)}
        />
      )}
    </Dialog>
  )
}
