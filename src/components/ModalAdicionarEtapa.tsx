// src/components/ModalAdicionarEtapa.tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/DatePicker'

export interface ModalAdicionarEtapaProps {
  open: boolean
  onClose: () => void
  idAcao: string
  responsaveis: { id: string; nome: string }[]
  onEtapaAdicionada: () => void
}

export default function ModalAdicionarEtapa({
  open,
  onClose,
  idAcao,
  responsaveis = [],
  onEtapaAdicionada,
}: ModalAdicionarEtapaProps) {
  const NONE = '__NONE__'
  const [descricao, setDescricao] = useState('')
  const [responsavelId, setResponsavelId] = useState<string>(NONE)
  const [dataInicio, setDataInicio] = useState<Date>()
  const [dataFim, setDataFim] = useState<Date>()
  const [loading, setLoading] = useState(false)

  // pega ID do status "Pendente" de forma dinâmica
  const [statusPendenteId, setStatusPendenteId] = useState<string>('')

  useEffect(() => {
    if (!open) return
    let cancel = false
    ;(async () => {
      const { data, error } = await supabase
        .from('status_etapa_tipos') // ajuste se o nome da tabela for diferente
        .select('id, nome')

      if (error || !data) return
      const pend = data.find(r => (r.nome || '').toLowerCase().includes('pendente'))
      if (!cancel) setStatusPendenteId(pend?.id || '')
    })()
    return () => { cancel = true }
  }, [open])

  async function handleSalvar() {
    if (!descricao.trim()) {
      alert('Descrição obrigatória.')
      return
    }
    if (!statusPendenteId) {
      alert('Não foi possível localizar o status "Pendente" no banco.')
      return
    }

    setLoading(true)
    try {
      // última ordem
      const { data: ultimas, error: errUlt } = await supabase
        .from('etapas')
        .select('etapa_ordem')
        .eq('id_acao', idAcao)
        .order('etapa_ordem', { ascending: false })
        .limit(1)

      if (errUlt) throw errUlt
      const proximaOrdem = (ultimas?.[0]?.etapa_ordem ?? 0) + 1

      const payload = {
        id_acao: idAcao,
        etapa_descricao: descricao.trim(),
        etapa_ordem: proximaOrdem,
        id_responsavel: responsavelId === NONE ? null : responsavelId,
        id_status_etapa: statusPendenteId,
        dt_inicio_etapa: dataInicio ? dataInicio.toISOString().slice(0, 10) : null,
        dt_termino_etapa: dataFim ? dataFim.toISOString().slice(0, 10) : null,
      }

      const { error: errIns } = await supabase.from('etapas').insert(payload)
      if (errIns) throw errIns

      onClose()
      onEtapaAdicionada()
      // reset local
      setDescricao('')
      setResponsavelId(NONE)
      setDataInicio(undefined)
      setDataFim(undefined)
    } catch (e: any) {
      console.error(e)
      alert(e?.message || 'Erro ao salvar etapa.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-md" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Adicionar Etapa</DialogTitle>
          <DialogDescription>
            Preencha os dados da etapa e selecione o responsável e as datas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Descrição</Label>
            <Input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Digite a descrição da etapa"
            />
          </div>

          <div>
            <Label>Responsável</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nenhum</SelectItem>
                {(responsaveis ?? []).map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Início (prevista)</Label>
              <DatePicker selectedDate={dataInicio} onSelectDate={setDataInicio} />
            </div>
            <div>
              <Label>Data Término (prevista)</Label>
              <DatePicker selectedDate={dataFim} onSelectDate={setDataFim} />
            </div>
          </div>

          <Button onClick={handleSalvar} disabled={loading || !statusPendenteId} className="w-full">
            {loading ? 'Salvando…' : 'Salvar Etapa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
