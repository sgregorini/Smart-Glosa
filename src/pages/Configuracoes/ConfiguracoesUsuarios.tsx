import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
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

// gera senha forte quando o campo vier em branco (evita 400 da Edge Function)
function gerarSenhaTemporaria() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?'
  let s = 'Tmp!'
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

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
  const [newPassword, setNewPassword] = useState('') // se vazio, geramos senha temporária

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: u, error: eu }, { data: s, error: es }] = await Promise.all([
      supabase.from('vw_usuarios_detalhes').select('*').order('created_at', { ascending: false }),
      supabase.from('setores').select('id, nome').order('nome'),
    ])
    if (eu) console.error('[vw_usuarios_detalhes] erro:', eu)
    if (es) console.error('[setores] erro:', es)
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
      nome: nome?.trim() || null,
      role: role || null,
      id_setor: idSetor || null,
    })
    if (error) console.error('[usuarios.upsert] erro:', error)
    setOpenEdit(false)
    fetchAll()
  }

  const confirmDelete = async () => {
      if (!deleting) return;

      // Call the Edge Function to handle the deletion securely on the server.
      try {
          const { data, error } = await supabase.functions.invoke('delete-user', {
              method: 'POST',
              body: { id: deleting.id },
          });

          if (error) {
              console.error('[invoke-delete] erro:', error);
              // Provide a user-friendly message.
              alert('Não foi possível excluir o usuário. Por favor, tente novamente ou entre em contato com o suporte.');
              return;
          }

          console.log('[invoke-delete] ok:', data);

      } catch (e) {
          console.error('[invoke-delete] exception:', e);
          alert('Erro ao se conectar com o servidor. Verifique sua conexão.');
      } finally {
          // Clear the state and refresh the list regardless of success or failure.
          setDeleting(null);
          fetchAll();
      }
  };

const createUser = async () => {
    const email = String(newEmail ?? '').trim();
    const nome = String(newNome ?? '').trim();
    const password = String(newPassword ?? '');
    const role = newRole || 'user';
    const id_setor = newSetor || null;

    if (!email || !nome) {
      alert('Preencha Email e Nome.');
      return;
    }

    if (password && password.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres, ou deixe em branco para enviar convite.');
      return;
    }

    const payload = { email, password, nome, role, id_setor };
    console.log('[create-user] payload =>', JSON.stringify(payload));

    const { data, error } = await supabase.functions.invoke('create-user', {
      method: 'POST',
      body: payload,
    });

    if (error) {
      console.error('[invoke] erro:', error);
      alert(`Erro ao criar usuário: ${error.message}`);
      return;
    }

    console.log('[create-user] ok:', data);

    // Limpa e fecha
    setOpenCreate(false);
    setNewEmail('');
    setNewPassword('');
    setNewNome('');
    setNewRole('user');
    setNewSetor('');
    fetchAll();
};


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
            <DialogDescription>Atualize nome, perfil e setor do usuário selecionado.</DialogDescription>
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
            <DialogDescription>Essa ação remove o usuário do Auth. Recomendado fazer via Edge Function.</DialogDescription>
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
            <DialogDescription>Preencha e-mail e nome. Se a senha ficar em branco, geramos uma temporária.</DialogDescription>
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
                placeholder="Se ficar vazio, geramos uma temporária"
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
