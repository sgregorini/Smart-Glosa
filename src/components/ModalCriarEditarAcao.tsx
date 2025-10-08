// ModalCriarEditarAcao.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
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
  SelectSeparator,
  SelectItem,
} from '@/components/ui/select'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import type { Acao, Responsavel } from '@/types'
import ModalAdicionarResponsavel from './ModalAdicionarResponsavel'

// Tipos de opções
type StatusOption = { id: string; nome: string }
type ResponsavelOption = { id: string; nome: string }
type OperadoraOption = { id: string; nome: string }
type GlosaOption = { id: string; codigo: string; descricao: string; ds_gru_fat?: string }
type SetorOption = { id: string; nome: string }

// Props
interface ModalCriarEditarAcaoProps {
  open: boolean
  onClose: () => void
  acao?: Acao | null
  onSave: () => void
}

// ──────────────────────────────────────────────────────────────────────────────
// MultiSelect com busca (pílulas + dropdown filtrável)
// ──────────────────────────────────────────────────────────────────────────────
type GenericOption = { id: string; label: string; sublabel?: string }

function MultiSelectSearch({
  options,
  selected,
  setSelected,
  placeholder = 'Pesquisar e selecionar…',
  searchPlaceholder = 'Buscar…',
  className = '',
  renderOption,
}: {
  options: GenericOption[]
  selected: string[]
  setSelected: (ids: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  renderOption?: (opt: GenericOption) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
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

  const selectedObjects = useMemo(
    () => options.filter((o) => selectedSet.has(o.id)),
    [options, selectedSet]
  )

  return (
    <div className={`relative ${className}`}>
      {/* Pílulas + botão abrir */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-h-10 flex-1 rounded-md border bg-background px-2 py-1.5">
          {selectedObjects.length === 0 ? (
            <span className="text-sm opacity-60">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedObjects.map((o) => (
                <span
                  key={o.id}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                >
                  <span className="truncate max-w-[220px]">{o.label}</span>
                  <button
                    type="button"
                    onClick={() => toggle(o.id)}
                    className="opacity-70 hover:opacity-100"
                    title="Remover"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => setOpen((v) => !v)}
          title="Selecionar"
        >
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <>
          <div
            className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md"
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          >
            <div className="p-2">
              <Input
                autoFocus
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="max-h-80 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm opacity-70">Nenhum item encontrado.</div>
              ) : (
                filtered.map((o) => {
                  const checked = selectedSet.has(o.id)
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggle(o.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex gap-2"
                    >
                      <Check className={`h-4 w-4 ${checked ? 'opacity-100' : 'opacity-0'}`} />
                      <div className="flex flex-col">
                        {renderOption ? (
                          renderOption(o)
                        ) : (
                          <>
                            <span className="truncate">{o.label}</span>
                            {o.sublabel ? (
                              <span className="text-xs opacity-70 truncate">{o.sublabel}</span>
                            ) : null}
                          </>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Clicar fora fecha */}
          <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} aria-hidden />
        </>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────────────────
export default function ModalCriarEditarAcao({
  open,
  onClose,
  acao,
  onSave,
}: ModalCriarEditarAcaoProps) {
  // Campos
  const [descricao, setDescricao] = useState('')
  const [causaRaiz, setCausaRaiz] = useState('')
  const [impacto, setImpacto] = useState<number | ''>('')
  const [dataInicio, setDataInicio] = useState<Date | undefined>()
  const [dataFim, setDataFim] = useState<Date | undefined>()
  const [observacoes, setObservacoes] = useState('')

  const [statusId, setStatusId] = useState('')
  const [responsavelId, setResponsavelId] = useState('')
  const [setorId, setSetorId] = useState('')

  // Multi
  const [operadoraIds, setOperadoraIds] = useState<string[]>([])
  const [glosaIds, setGlosaIds] = useState<string[]>([])

  // Options
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([])
  const [responsavelOptions, setResponsavelOptions] = useState<ResponsavelOption[]>([])
  const [operadoraOptions, setOperadoraOptions] = useState<OperadoraOption[]>([])
  const [glosaOptions, setGlosaOptions] = useState<GlosaOption[]>([])
  const [setorOptions, setSetorOptions] = useState<SetorOption[]>([])

  const [modalNovoResponsavel, setModalNovoResponsavel] = useState(false)
  const isEdit = !!acao
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Reset centralizado
  function resetForm() {
    setDescricao('')
    setCausaRaiz('')
    setImpacto('')
    setDataInicio(undefined)
    setDataFim(undefined)
    setObservacoes('')
    setStatusId('')
    setResponsavelId('')
    setSetorId('')
    setOperadoraIds([])
    setGlosaIds([])
  }

  // Carrega opções ao abrir
  useEffect(() => {
    async function loadOptions() {
      const [status, resp, op, gls, sts] = await Promise.all([
        supabase.from('status_acao_tipos').select('id, nome'),
        supabase.from('responsaveis').select('id, nome'),
        supabase.from('operadoras').select('id, nome'),
        supabase.from('glosas').select('id, codigo, descricao, ds_gru_fat'),
        supabase.from('setores').select('id, nome'),
      ])
      if (status.data) setStatusOptions(status.data as StatusOption[])
      if (resp.data) setResponsavelOptions(resp.data as ResponsavelOption[])
      if (op.data) setOperadoraOptions(op.data as OperadoraOption[])
      if (gls.data) setGlosaOptions(gls.data as GlosaOption[])
      if (sts.data) setSetorOptions(sts.data as SetorOption[])
    }
    if (open) loadOptions()
  }, [open])

  // Preenche para edição / zera para novo quando `acao` muda
  useEffect(() => {
    async function hydrateManyToMany(acaoId: string) {
      const [gls, ops] = await Promise.all([
        supabase.from('acoes_glosas').select('glosa_id').eq('acao_id', acaoId),
        supabase.from('acoes_operadoras').select('operadora_id').eq('acao_id', acaoId),
      ])
      if (gls.data) setGlosaIds(gls.data.map((r: any) => r.glosa_id))
      if (ops.data) setOperadoraIds(ops.data.map((r: any) => r.operadora_id))
    }

    if (acao) {
      setDescricao(acao.acao_descricao || '')
      setCausaRaiz(acao.causa_raiz || '')
      setImpacto(acao.vl_impacto ?? '')
      setDataInicio(acao.dt_inicio_acao ? new Date(acao.dt_inicio_acao) : undefined)
      setDataFim(acao.dt_termino_acao ? new Date(acao.dt_termino_acao) : undefined)
      setObservacoes(acao.observacoes || '')
      setStatusId(acao.id_status_acao || '')
      setResponsavelId(acao.id_responsavel || '')
      setSetorId(acao.id_setor_responsavel || '')
      if (acao.id) hydrateManyToMany(acao.id)
    } else {
      resetForm()
    }
  }, [acao])

  // Zera ao abrir em “Nova Ação”
  useEffect(() => {
    if (open && !acao) resetForm()
  }, [open, acao])

  // Sincroniza N:N
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
    const selectedSet = new Set(selectedIds)

    const toInsert = [...selectedSet].filter((id) => !currentIds.has(id))
    const toDelete = [...currentIds].filter((id) => !selectedSet.has(id))

    if (toInsert.length > 0) {
      const rows = toInsert.map((id) => ({ acao_id: acaoId, [idColumn]: id }))
      const ins = await supabase.from(table).insert(rows)
      if (ins.error) throw ins.error
    }
    if (toDelete.length > 0) {
      const del = await supabase.from(table).delete().eq('acao_id', acaoId).in(idColumn, toDelete)
      if (del.error) throw del.error
    }
  }

  async function handleSalvar() {
    const descOk = descricao.trim().length > 0
    const statusOk = !!statusId
    const respOk = !!responsavelId

    // Regras: na criação exige responsável; na edição não obriga
    if (!descOk || !statusOk || (!isEdit && !respOk)) {
      alert(isEdit
        ? 'Preencha ao menos descrição e status.'
        : 'Preencha ao menos descrição, status e responsável.'
      )
      return
    }

    const payload = {
      acao_descricao: descricao.trim(),
      causa_raiz: causaRaiz || null,
      vl_impacto: impacto === '' ? null : impacto,
      dt_inicio_acao: dataInicio?.toISOString().slice(0, 10) ?? null,
      dt_termino_acao: dataFim?.toISOString().slice(0, 10) ?? null,
      observacoes: observacoes || null,
      id_status_acao: statusId,
      id_responsavel: responsavelId || null,
      id_setor_responsavel: setorId || null,
    }

    try {
      let acaoId: string
      if (isEdit && acao?.id) {
        const { error } = await supabase.from('acoes').update(payload).eq('id', acao.id)
        if (error) throw error
        acaoId = acao.id
      } else {
        const { data, error } = await supabase.from('acoes').insert(payload).select('id').single()
        if (error) throw error
        acaoId = data.id
      }

      await Promise.all([
        syncManyToMany({ acaoId, table: 'acoes_glosas', idColumn: 'glosa_id', selectedIds: glosaIds }),
        syncManyToMany({ acaoId, table: 'acoes_operadoras', idColumn: 'operadora_id', selectedIds: operadoraIds }),
      ])

      onSave()
      resetForm()
      onClose()
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar ação.')
    }
  }

  // Opções para o MultiSelect
  const glosaOptionsGeneric: GenericOption[] = useMemo(
    () =>
      glosaOptions.map((g) => ({
        id: g.id,
        label: `${g.codigo} — ${g.descricao}`,
        sublabel: g.ds_gru_fat,
      })),
    [glosaOptions]
  )

  const operadoraOptionsGeneric: GenericOption[] = useMemo(
    () =>
      operadoraOptions.map((o) => ({
        id: o.id,
        label: o.nome,
      })),
    [operadoraOptions]
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm()
          onClose()
        }
      }}
    >
      <DialogContent
        ref={contentRef}
        className="w-[980px] max-w-[98vw] overflow-visible"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Ação' : 'Nova Ação'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize os dados da ação conforme necessário.' : 'Preencha os dados para criar uma nova ação.'}
          </DialogDescription>
        </DialogHeader>

        {/* GRID 12 COLS */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>

          <div className="col-span-12">
            <Label>Causa Raiz</Label>
            <Textarea value={causaRaiz} onChange={(e) => setCausaRaiz(e.target.value)} />
          </div>

          <div className="col-span-3">
            <Label>Impacto (R$)</Label>
            <Input
              type="number"
              value={impacto}
              onChange={(e) => setImpacto(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div className="col-span-3">
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

          <div className="col-span-3">
            <Label>Área</Label>
            <Select value={setorId} onValueChange={setSetorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {setorOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-3">
            <Label>Responsável</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <div
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground text-blue-600"
                  onClick={() => setModalNovoResponsavel(true)}
                >
                  + Adicionar Novo Responsável
                </div>
                <SelectSeparator />
                {responsavelOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-3">
            <Label>Data Início</Label>
            <DatePicker
              selectedDate={dataInicio}
              onSelectDate={setDataInicio}
              portalContainer={contentRef.current}
            />
          </div>

          <div className="col-span-3">
            <Label>Data Fim</Label>
            <DatePicker
              selectedDate={dataFim}
              onSelectDate={setDataFim}
              portalContainer={contentRef.current}
            />
          </div>

          <div className="col-span-6">
            <Label>Operadoras (múltipla seleção)</Label>
            <MultiSelectSearch
              options={operadoraOptionsGeneric}
              selected={operadoraIds}
              setSelected={setOperadoraIds}
              placeholder="Selecione uma ou mais operadoras…"
              searchPlaceholder="Buscar operadora…"
            />
          </div>

          <div className="col-span-6">
            <Label>Motivos de Glosa (múltipla seleção)</Label>
            <MultiSelectSearch
              options={glosaOptionsGeneric}
              selected={glosaIds}
              setSelected={setGlosaIds}
              placeholder="Selecione um ou mais motivos…"
              searchPlaceholder="Buscar por código/descrição…"
              renderOption={(o) => (
                <>
                  <span className="truncate">{o.label}</span>
                  {o.sublabel ? <span className="text-xs opacity-70 truncate">{o.sublabel}</span> : null}
                </>
              )}
            />
          </div>

          <div className="col-span-12">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end pt-4 gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              resetForm()
              onClose()
            }}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSalvar}>
            {isEdit ? 'Atualizar' : 'Criar'}
          </Button>
        </div>

        <ModalAdicionarResponsavel
          open={modalNovoResponsavel}
          onClose={() => setModalNovoResponsavel(false)}
          onResponsavelCriado={(novoResponsavel: Responsavel) => {
            // Atualiza a lista de opções e já seleciona o novo
            setResponsavelOptions((prev) => [...prev, novoResponsavel].sort((a, b) => a.nome.localeCompare(b.nome)))
            setResponsavelId(novoResponsavel.id)
            setModalNovoResponsavel(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
