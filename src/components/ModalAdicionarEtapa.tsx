import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
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

  const STATUS_PENDENTE = '5e906c02-ce9f-456f-9c44-5fa081539f90'


  async function handleSalvar() {
    if (!descricao.trim()) {
      alert('Descrição obrigatória.')
      return
    }
    setLoading(true)

    const { data: ultimas, error: err } = await supabase
      .from('etapas')
      .select('etapa_ordem')
      .eq('id_acao', idAcao)
      .order('etapa_ordem', { ascending: false })
      .limit(1)

    if (err) {
      console.error(err)
      alert('Erro ao buscar última ordem.')
      setLoading(false)
      return
    }

    const proximaOrdem = (ultimas?.[0]?.etapa_ordem ?? 0) + 1

    const { error } = await supabase.from('etapas').insert({
      id_acao: idAcao,
      etapa_descricao: descricao,
      etapa_ordem: proximaOrdem,
      id_responsavel: responsavelId === NONE ? null : responsavelId,
      id_status_etapa: STATUS_PENDENTE,
      dt_inicio_etapa: dataInicio ? dataInicio.toISOString().slice(0, 10) : null,
      dt_termino_etapa: dataFim ? dataFim.toISOString().slice(0, 10) : null,
    })

    setLoading(false)
    if (error) {
      console.error(error)
      alert('Erro ao salvar etapa.')
    } else {
      onClose()
      onEtapaAdicionada()
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
              <Label>Data Início</Label>
              <DatePicker selectedDate={dataInicio} onSelectDate={setDataInicio} />
            </div>
            <div>
              <Label>Data Término</Label>
              <DatePicker selectedDate={dataFim} onSelectDate={setDataFim} />
            </div>
          </div>

          <Button onClick={handleSalvar} disabled={loading} className="w-full">
            {loading ? 'Salvando…' : 'Salvar Etapa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
