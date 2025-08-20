import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2 } from 'lucide-react'

type Usuario = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  confirmado: boolean
  nome: string | null
  role: string | null
  id_setor: string | null
}

type Setor = { id: string; nome: string }

export default function ConfiguracoesUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [loading, setLoading] = useState(true)

  // estado do modal
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [nome, setNome] = useState('')
  const [role, setRole] = useState('')
  const [idSetor, setIdSetor] = useState<string>('')

  const [deleting, setDeleting] = useState<Usuario | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: u }, { data: s }] = await Promise.all([
      supabase.from('vw_usuarios_detalhes').select('*').order('created_at', { ascending: false }),
      supabase.from('setores').select('id, nome').order('nome'),
    ])
    setUsuarios((u as Usuario[]) ?? [])
    setSetores((s as Setor[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const setoresMap = useMemo(() => {
    const m = new Map<string, string>()
    setores.forEach(s => m.set(s.id, s.nome))
    return m
  }, [setores])

  const openEdit = (u: Usuario) => {
    setEditing(u)
    setNome(u.nome ?? '')
    setRole(u.role ?? '')
    setIdSetor(u.id_setor ?? '')
    setOpen(true)
  }

  const save = async () => {
    if (!editing) return
    await supabase.from('usuarios').upsert({
      id: editing.id,
      nome,
      role,
      id_setor: idSetor || null,
    })
    setOpen(false)
    fetchAll()
  }

  const confirmDelete = async () => {
    if (!deleting) return
    // ⚠️ Excluir do auth.users
    const { error } = await supabase.auth.admin.deleteUser(deleting.id)
    if (error) console.error(error)
    setDeleting(null)
    fetchAll()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações – Usuários</h1>

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="text-sm text-gray-500">Carregando…</div>
          ) : usuarios.length === 0 ? (
            <div className="text-sm text-gray-500">Nenhum usuário encontrado.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Nome</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Setor</div>
                <div className="col-span-1">Conf.</div>
                <div className="col-span-2 text-right">Ações</div>
              </div>
              {usuarios.map(u => (
                <div key={u.id} className="grid grid-cols-12 px-4 py-2 border-t items-center text-sm">
                  <div className="col-span-3">{u.email}</div>
                  <div className="col-span-2">{u.nome ?? '—'}</div>
                  <div className="col-span-2">{u.role ?? '—'}</div>
                  <div className="col-span-2">{u.id_setor ? setoresMap.get(u.id_setor) : '—'}</div>
                  <div className="col-span-1">{u.confirmado ? '✔️' : '❌'}</div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEdit(u)}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => setDeleting(u)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Nome</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Role</label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Setor</label>
              <select
                className="w-full h-10 border rounded-md px-3"
                value={idSetor}
                onChange={(e) => setIdSetor(e.target.value)}
              >
                <option value="">— sem setor —</option>
                {setores.map(s => (
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

      {/* Modal Deletar */}
      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Tem certeza que deseja excluir "{deleting?.email}"?
          </p>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
