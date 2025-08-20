import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Plus } from 'lucide-react'

// Tipos
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

// Se você quiser buscar da tabela roles, deixe este array vazio e carregue do BD.
// Por ora, usamos opções fixas.
const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gestor' },
  { value: 'user', label: 'Usuário' },
  { value: 'viewer', label: 'Somente leitura' },
]

export default function ConfiguracoesUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [loading, setLoading] = useState(true)

  // Modal Editar
  const [openEdit, setOpenEdit] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [nome, setNome] = useState('')
  const [role, setRole] = useState('')
  const [idSetor, setIdSetor] = useState<string>('')

  // Modal Delete
  const [deleting, setDeleting] = useState<Usuario | null>(null)

  // Modal Criar
  const [openCreate, setOpenCreate] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newNome, setNewNome] = useState('')
  const [newRole, setNewRole] = useState('user')
  const [newSetor, setNewSetor] = useState<string>('')
  const [newPassword, setNewPassword] = useState('') // opcional; se vazio, envia convite

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: u, error: eu }, { data: s, error: es }] = await Promise.all([
      supabase.from('vw_usuarios_detalhes').select('*').order('created_at', { ascending: false }),
      supabase.from('setores').select('id, nome').order('nome'),
    ])
    if (eu) console.error(eu)
    if (es) console.error(es)
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

  const openEditModal = (u: Usuario) => {
    setEditing(u)
    setNome(u.nome ?? '')
    setRole(u.role ?? '')
    setIdSetor(u.id_setor ?? '')
    setOpenEdit(true)
  }

  const saveEdit = async () => {
    if (!editing) return
    const { error } = await supabase.from('usuarios').upsert({
      id: editing.id,
      nome,
      role: role || null,
      id_setor: idSetor || null,
    })
    if (error) console.error(error)
    setOpenEdit(false)
    fetchAll()
  }

  const confirmDelete = async () => {
    if (!deleting) return
    // Exclui no Auth (requer privilégios de Admin API; funciona se seu supabaseClient estiver com service role no backend.
    // No front, normalmente não é possível; considere criar outra edge function de delete se precisar.)
    const { error } = await supabase.auth.admin.deleteUser(deleting.id)
    if (error) console.error(error)
    setDeleting(null)
    fetchAll()
  }

  const createUser = async () => {
    // Chama Edge Function 'create-user'. Se password vazio => convite por e-mail.
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: newEmail,
        password: newPassword || null,
        nome: newNome || null,
        role: newRole || 'user',
        id_setor: newSetor || null,
      },
    })
    if (error) {
      console.error(error)
      alert('Erro ao criar usuário: ' + error.message)
      return
    }
    // Limpa e fecha
    setOpenCreate(false)
    setNewEmail(''); setNewPassword(''); setNewNome(''); setNewRole('user'); setNewSetor('')
    fetchAll()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configurações – Usuários</h1>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="mr-2" size={16} /> Adicionar usuário
        </Button>
      </div>

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
                  <div className="col-span-3 truncate">{u.email}</div>
                  <div className="col-span-2 truncate">{u.nome ?? '—'}</div>
                  <div className="col-span-2">{u.role ?? '—'}</div>
                  <div className="col-span-2">{u.id_setor ? setoresMap.get(u.id_setor) : '—'}</div>
                  <div className="col-span-1">{u.confirmado ? '✔️' : '❌'}</div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEditModal(u)}>
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
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
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
              <select
                className="w-full h-10 border rounded-md px-3"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">— selecione —</option>
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
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
            <Button variant="ghost" onClick={() => setOpenEdit(false)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
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

      {/* Modal Criar */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Nome</label>
              <Input value={newNome} onChange={(e) => setNewNome(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Role</label>
              <select
                className="w-full h-10 border rounded-md px-3"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Setor</label>
              <select
                className="w-full h-10 border rounded-md px-3"
                value={newSetor}
                onChange={(e) => setNewSetor(e.target.value)}
              >
                <option value="">— sem setor —</option>
                {setores.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Senha (opcional)</label>
              <Input
                type="password"
                placeholder="Deixe vazio para enviar convite por e-mail"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={createUser}>Criar usuário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
