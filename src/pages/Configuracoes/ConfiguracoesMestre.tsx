// src/pages/Configuracoes.tsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type StatusRow = { id: string; nome: string; descricao?: string | null }
type SetorRow = { id: string; nome: string }
type OperadoraRow = { id: string; nome: string }
type ResponsavelRow = { id: string; nome: string; email: string; id_setor: string | null }
type GlosaRow = { id: string; codigo: string; descricao: string | null; tipo: string | null }
type Overview = {
  total_usuarios: number
  total_roles: number
  total_setores: number
  total_responsaveis: number
  total_operadoras: number
  total_glosas: number
  total_status_acao: number
  total_status_etapa: number
}

function useOverview() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.from('vw_config_overview').select('*').single()
      if (!error && data) setData(data as Overview)
      setLoading(false)
    }
    run()
  }, [])
  return { data, loading }
}

function SectionHeader({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      {onAdd && (
        <Button onClick={onAdd} className="flex items-center gap-2">
          <Plus size={16} /> Novo
        </Button>
      )}
    </div>
  )
}

function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">{message}</p>
        <DialogFooter className="mt-4 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** ===== Generic CRUD for status tables ===== */
function StatusCrud({ table, title }: { table: 'status_acao_tipos' | 'status_etapa_tipos'; title: string }) {
  const [rows, setRows] = useState<StatusRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StatusRow | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [del, setDel] = useState<StatusRow | null>(null)

  const fetchRows = async () => {
    setLoading(true)
    const { data } = await supabase.from(table).select('id, nome, descricao').order('nome')
    setRows((data as StatusRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchRows() }, [table])

  const openCreate = () => { setEditing(null); setNome(''); setDescricao(''); setOpen(true) }
  const openEdit = (r: StatusRow) => { setEditing(r); setNome(r.nome); setDescricao(r.descricao ?? ''); setOpen(true) }

  const save = async () => {
    if (!nome.trim()) return
    if (editing) {
      await supabase.from(table).update({ nome, descricao }).eq('id', editing.id)
    } else {
      await supabase.from(table).insert({ nome, descricao })
    }
    setOpen(false)
    fetchRows()
  }

  const confirmDelete = async () => {
    if (!del) return
    await supabase.from(table).delete().eq('id', del.id)
    setDel(null)
    fetchRows()
  }

  return (
    <div>
      <SectionHeader title={title} onAdd={openCreate} />
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">
          <div className="col-span-4">Nome</div>
          <div className="col-span-6">Descrição</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Nenhum registro.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="grid grid-cols-12 px-4 py-2 border-t items-center">
              <div className="col-span-4">{r.nome}</div>
              <div className="col-span-6">{r.descricao}</div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(r)}><Pencil size={16} /></Button>
                <Button variant="destructive" size="icon" onClick={() => setDel(r)}><Trash2 size={16} /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} status</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Nome</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Descrição</label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <ConfirmDialog
        open={!!del}
        title="Excluir status"
        message={`Tem certeza que deseja excluir "${del?.nome}"?`}
        onConfirm={confirmDelete}
        onClose={() => setDel(null)}
      />
    </div>
  )
}

/** ===== CRUD Setores ===== */
function SetoresCrud() {
  const [rows, setRows] = useState<SetorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SetorRow | null>(null)
  const [nome, setNome] = useState('')
  const [del, setDel] = useState<SetorRow | null>(null)

  const fetchRows = async () => {
    setLoading(true)
    const { data } = await supabase.from('setores').select('id, nome').order('nome')
    setRows((data as SetorRow[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchRows() }, [])

  const openCreate = () => { setEditing(null); setNome(''); setOpen(true) }
  const openEdit = (r: SetorRow) => { setEditing(r); setNome(r.nome); setOpen(true) }

  const save = async () => {
    if (!nome.trim()) return
    if (editing) await supabase.from('setores').update({ nome }).eq('id', editing.id)
    else await supabase.from('setores').insert({ nome })
    setOpen(false)
    fetchRows()
  }

  const confirmDelete = async () => {
    if (!del) return
    await supabase.from('setores').delete().eq('id', del.id)
    setDel(null)
    fetchRows()
  }

  return (
    <div>
      <SectionHeader title="Setores" onAdd={openCreate} />
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">
          <div className="col-span-10">Nome</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Nenhum registro.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="grid grid-cols-12 px-4 py-2 border-t items-center">
              <div className="col-span-10">{r.nome}</div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(r)}><Pencil size={16} /></Button>
                <Button variant="destructive" size="icon" onClick={() => setDel(r)}><Trash2 size={16} /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} setor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Nome</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        title="Excluir setor"
        message={`Tem certeza que deseja excluir "${del?.nome}"?`}
        onConfirm={confirmDelete}
        onClose={() => setDel(null)}
      />
    </div>
  )
}

/** ===== CRUD Operadoras ===== */
function OperadorasCrud() {
  const [rows, setRows] = useState<OperadoraRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<OperadoraRow | null>(null)
  const [nome, setNome] = useState('')
  const [del, setDel] = useState<OperadoraRow | null>(null)

  const fetchRows = async () => {
    setLoading(true)
    const { data } = await supabase.from('operadoras').select('id, nome').order('nome')
    setRows((data as OperadoraRow[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchRows() }, [])

  const openCreate = () => { setEditing(null); setNome(''); setOpen(true) }
  const openEdit = (r: OperadoraRow) => { setEditing(r); setNome(r.nome); setOpen(true) }

  const save = async () => {
    if (!nome.trim()) return
    if (editing) await supabase.from('operadoras').update({ nome }).eq('id', editing.id)
    else await supabase.from('operadoras').insert({ nome })
    setOpen(false)
    fetchRows()
  }

  const confirmDelete = async () => {
    if (!del) return
    await supabase.from('operadoras').delete().eq('id', del.id)
    setDel(null)
    fetchRows()
  }

  return (
    <div>
      <SectionHeader title="Operadoras (Convênios)" onAdd={openCreate} />
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">
          <div className="col-span-10">Nome</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Nenhum registro.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="grid grid-cols-12 px-4 py-2 border-t items-center">
              <div className="col-span-10">{r.nome}</div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(r)}><Pencil size={16} /></Button>
                <Button variant="destructive" size="icon" onClick={() => setDel(r)}><Trash2 size={16} /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nova'} operadora</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Nome</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        title="Excluir operadora"
        message={`Tem certeza que deseja excluir "${del?.nome}"?`}
        onConfirm={confirmDelete}
        onClose={() => setDel(null)}
      />
    </div>
  )
}

/** ===== CRUD Responsáveis ===== */
function ResponsaveisCrud() {
  const [rows, setRows] = useState<ResponsavelRow[]>([])
  const [setores, setSetores] = useState<SetorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ResponsavelRow | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [idSetor, setIdSetor] = useState<string>('')
  const [del, setDel] = useState<ResponsavelRow | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: r }, { data: s }] = await Promise.all([
      supabase.from('responsaveis').select('id, nome, email, id_setor').order('nome'),
      supabase.from('setores').select('id, nome').order('nome'),
    ])
    setRows((r as ResponsavelRow[]) ?? [])
    setSetores((s as SetorRow[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchAll() }, [])

  const setoresMap = useMemo(() => {
    const m = new Map<string, string>()
    setores.forEach(s => m.set(s.id, s.nome))
    return m
  }, [setores])

  const openCreate = () => { setEditing(null); setNome(''); setEmail(''); setIdSetor(''); setOpen(true) }
  const openEdit = (row: ResponsavelRow) => {
    setEditing(row)
    setNome(row.nome)
    setEmail(row.email)
    setIdSetor(row.id_setor ?? '')
    setOpen(true)
  }

  const save = async () => {
    if (!nome.trim() || !email.trim()) return
    const payload = { nome, email, id_setor: idSetor || null }
    if (editing) await supabase.from('responsaveis').update(payload).eq('id', editing.id)
    else await supabase.from('responsaveis').insert(payload)
    setOpen(false)
    fetchAll()
  }

  const confirmDelete = async () => {
    if (!del) return
    await supabase.from('responsaveis').delete().eq('id', del.id)
    setDel(null)
    fetchAll()
  }

  return (
    <div>
      <SectionHeader title="Responsáveis" onAdd={openCreate} />
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">
          <div className="col-span-4">Nome</div>
          <div className="col-span-4">E-mail</div>
          <div className="col-span-2">Setor</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Nenhum registro.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="grid grid-cols-12 px-4 py-2 border-t items-center">
              <div className="col-span-4">{r.nome}</div>
              <div className="col-span-4">{r.email}</div>
              <div className="col-span-2">{r.id_setor ? setoresMap.get(r.id_setor) : '—'}</div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(r)}><Pencil size={16} /></Button>
                <Button variant="destructive" size="icon" onClick={() => setDel(r)}><Trash2 size={16} /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} responsável</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Nome</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">E-mail</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Setor</label>
              <select
                className="w-full h-10 border rounded-md px-3"
                value={idSetor}
                onChange={(e) => setIdSetor(e.target.value)}
              >
                <option value="">— sem setor —</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        title="Excluir responsável"
        message={`Tem certeza que deseja excluir "${del?.nome}"?`}
        onConfirm={confirmDelete}
        onClose={() => setDel(null)}
      />
    </div>
  )
}

/** ===== CRUD Glosas ===== */
function GlosasCrud() {
  const [rows, setRows] = useState<GlosaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<GlosaRow | null>(null)
  const [codigo, setCodigo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState('')
  const [del, setDel] = useState<GlosaRow | null>(null)

  const fetchRows = async () => {
    setLoading(true)
    const { data } = await supabase.from('glosas').select('id, codigo, descricao, tipo').order('codigo')
    setRows((data as GlosaRow[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchRows() }, [])

  const openCreate = () => { setEditing(null); setCodigo(''); setDescricao(''); setTipo(''); setOpen(true) }
  const openEdit = (r: GlosaRow) => {
    setEditing(r); setCodigo(r.codigo); setDescricao(r.descricao ?? ''); setTipo(r.tipo ?? ''); setOpen(true)
  }

  const save = async () => {
    if (!codigo.trim()) return
    const payload = { codigo, descricao: descricao || null, tipo: tipo || null }
    if (editing) await supabase.from('glosas').update(payload).eq('id', editing.id)
    else await supabase.from('glosas').insert(payload)
    setOpen(false)
    fetchRows()
  }

  const confirmDelete = async () => {
    if (!del) return
    await supabase.from('glosas').delete().eq('id', del.id)
    setDel(null)
    fetchRows()
  }

  return (
    <div>
      <SectionHeader title="Glosas" onAdd={openCreate} />
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">
          <div className="col-span-3">Código</div>
          <div className="col-span-7">Descrição</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Nenhum registro.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="grid grid-cols-12 px-4 py-2 border-t items-center">
              <div className="col-span-3">{r.codigo}</div>
              <div className="col-span-7 truncate">{r.descricao}</div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(r)}><Pencil size={16} /></Button>
                <Button variant="destructive" size="icon" onClick={() => setDel(r)}><Trash2 size={16} /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nova'} glosa</DialogTitle></DialogHeader>
        <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Código</label>
              <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Descrição</label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Tipo</label>
              <Input value={tipo} onChange={(e) => setTipo(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        title="Excluir glosa"
        message={`Tem certeza que deseja excluir "${del?.codigo}"?`}
        onConfirm={confirmDelete}
        onClose={() => setDel(null)}
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  )
}

export default function Configuracoes() {
  const { data: ov, loading } = useOverview()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      {/* Overview */}
      <Card>
        <CardContent className="p-4">
          {loading || !ov ? (
            <div className="text-sm text-gray-500">Carregando visão geral…</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <Stat label="Usuários" value={ov.total_usuarios} />
              <Stat label="Perfis (roles)" value={ov.total_roles} />
              <Stat label="Setores" value={ov.total_setores} />
              <Stat label="Responsáveis" value={ov.total_responsaveis} />
              <Stat label="Operadoras" value={ov.total_operadoras} />
              <Stat label="Glosas" value={ov.total_glosas} />
              <Stat label="Status Ação" value={ov.total_status_acao} />
              <Stat label="Status Etapa" value={ov.total_status_etapa} />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="setores">Setores</TabsTrigger>
          <TabsTrigger value="operadoras">Operadoras</TabsTrigger>
          <TabsTrigger value="responsaveis">Responsáveis</TabsTrigger>
          <TabsTrigger value="glosas">Glosas</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-8 mt-4">
          <StatusCrud table="status_acao_tipos" title="Status da Ação" />
          <StatusCrud table="status_etapa_tipos" title="Status da Etapa" />
        </TabsContent>

        <TabsContent value="setores" className="mt-4">
          <SetoresCrud />
        </TabsContent>

        <TabsContent value="operadoras" className="mt-4">
          <OperadorasCrud />
        </TabsContent>

        <TabsContent value="responsaveis" className="mt-4">
          <ResponsaveisCrud />
        </TabsContent>

        <TabsContent value="glosas" className="mt-4">
          <GlosasCrud />
        </TabsContent>
      </Tabs>
    </div>
  )
}
