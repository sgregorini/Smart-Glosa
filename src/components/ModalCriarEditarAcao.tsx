// ModalCriarEditarAcao.tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/DatePicker'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

import type { Acao } from '@/types'

interface ModalCriarEditarAcaoProps {
  open: boolean
  onClose: () => void
  acao?: Acao | null
  onSave: () => void
}

export default function ModalCriarEditarAcao({
  open,
  onClose,
  acao,
  onSave,
}: ModalCriarEditarAcaoProps) {
  const [descricao, setDescricao] = useState('')
  const [causaRaiz, setCausaRaiz] = useState('')
  const [impacto, setImpacto] = useState<number | ''>('')
  const [dataInicio, setDataInicio] = useState<Date | undefined>()
  const [dataFim, setDataFim] = useState<Date | undefined>()
  const [observacoes, setObservacoes] = useState('')

  const [statusId, setStatusId] = useState('')
  const [responsavelId, setResponsavelId] = useState('')
  const [setorId, setSetorId] = useState('')
  const [operadoraId, setOperadoraId] = useState('')
  const [glosaId, setGlosaId] = useState('')

  const [statusOptions, setStatusOptions] = useState<any[]>([])
  const [responsavelOptions, setResponsavelOptions] = useState<any[]>([])
  const [operadoraOptions, setOperadoraOptions] = useState<any[]>([])
  const [glosaOptions, setGlosaOptions] = useState<any[]>([])

  const isEdit = !!acao

  useEffect(() => {
    async function loadOptions() {
      const [status, resp, op, gls] = await Promise.all([
        supabase.from('status_acao_tipos').select('*'),
        supabase.from('responsaveis').select('*'),
        supabase.from('operadoras').select('*'),
        supabase.from('glosas').select('*'),
      ])
      if (status.data) setStatusOptions(status.data)
      if (resp.data) setResponsavelOptions(resp.data)
      if (op.data) setOperadoraOptions(op.data)
      if (gls.data) setGlosaOptions(gls.data)
    }
    loadOptions()
  }, [])

  useEffect(() => {
    if (acao) {
      setDescricao(acao.acao_descricao || '')
      setCausaRaiz(acao.causa_raiz || '')
      setImpacto(acao.vl_impacto || '')
      setDataInicio(acao.dt_inicio_acao ? new Date(acao.dt_inicio_acao) : undefined)
      setDataFim(acao.dt_termino_acao ? new Date(acao.dt_termino_acao) : undefined)
      setObservacoes(acao.observacoes || '')
      setStatusId(acao.id_status_acao || '')
      setResponsavelId(acao.id_responsavel || '')
      setSetorId(acao.id_setor_responsavel || '')
      setOperadoraId(acao.id_operadora || '')
      setGlosaId(acao.id_glosa || '')
    } else {
      setDescricao('')
      setCausaRaiz('')
      setImpacto('')
      setDataInicio(undefined)
      setDataFim(undefined)
      setObservacoes('')
      setStatusId('')
      setResponsavelId('')
      setSetorId('')
      setOperadoraId('')
      setGlosaId('')
    }
  }, [acao])

  async function handleSalvar() {
    if (!descricao || !statusId || !responsavelId) {
      alert('Preencha ao menos descrição, status e responsável.')
      return
    }

    const payload = {
      acao_descricao: descricao,
      causa_raiz: causaRaiz,
      vl_impacto: impacto === '' ? null : impacto,
      dt_inicio_acao: dataInicio?.toISOString().slice(0, 10),
      dt_termino_acao: dataFim?.toISOString().slice(0, 10),
      observacoes,
      id_status_acao: statusId,
      id_responsavel: responsavelId,
      id_setor_responsavel: setorId || null,
      id_operadora: operadoraId || null,
      id_glosa: glosaId || null,
    }

    const { error } = isEdit
      ? await supabase.from('acoes').update(payload).eq('id', acao!.id)
      : await supabase.from('acoes').insert(payload)

    if (error) {
      console.error(error)
      alert('Erro ao salvar ação.')
      return
    }

    onSave()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Ação' : 'Nova Ação'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize os dados da ação conforme necessário.'
              : 'Preencha os dados para criar uma nova ação.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>

          <div className="col-span-2">
            <Label>Causa Raiz</Label>
            <Textarea value={causaRaiz} onChange={(e) => setCausaRaiz(e.target.value)} />
          </div>

          <div>
            <Label>Impacto (R$)</Label>
            <Input
              type="number"
              value={impacto}
              onChange={(e) => setImpacto(Number(e.target.value))}
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data Início</Label>
            <DatePicker selectedDate={dataInicio} onSelectDate={setDataInicio} />
          </div>

          <div>
            <Label>Data Fim</Label>
            <DatePicker selectedDate={dataFim} onSelectDate={setDataFim} />
          </div>

          <div>
            <Label>Responsável</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {responsavelOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Operadora</Label>
            <Select value={operadoraId} onValueChange={setOperadoraId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {operadoraOptions.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Glosa</Label>
            <Select value={glosaId} onValueChange={setGlosaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {glosaOptions.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.cd_glosa} - {g.ds_gru_fat_glosa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end pt-4 gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar}>{isEdit ? 'Atualizar' : 'Criar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
