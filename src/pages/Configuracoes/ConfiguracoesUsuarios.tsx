import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Plus, Send, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

// Tipos
type Usuario = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  confirmado: boolean
  nome: string | null
  role: string | null // Este 'role' vem da VIEW e é o 'role_slug'
  id_setor: string | null
}
type Role = { slug: string; nome: string }
type Setor = { id: string; nome: string }
type Responsavel = { id: string; nome: string; email: string; id_setor: string | null }

export default function ConfiguracoesUsuarios() {
  const { role: userRole, loadingAuth } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [responsaveisSemAcesso, setResponsaveisSemAcesso] = useState<Responsavel[]>([])
  const [loading, setLoading] = useState(true)

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [deletingUser, setDeletingUser] = useState<Usuario | null>(null)
  
  // Campos do formulário
  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    role_slug: 'user',
    id_setor: '',
    password: '',
  })

  const fetchAll = async () => {
    setLoading(true)
    const [
      { data: u, error: eu },
      { data: s, error: es },
      { data: r, error: er },
      { data: ro, error: ero },
    ] = await Promise.all([
      supabase.from('vw_usuarios_detalhes').select('*').order('created_at', { ascending: false }),
      supabase.from('setores').select('id, nome').order('nome'),
      supabase.from('responsaveis').select('*'),
      supabase.from('roles').select('slug, nome'),
    ])

    if (eu) console.error('[vw_usuarios_detalhes] erro:', eu)
    if (es) console.error('[setores] erro:', es)
    if (er) console.error('[responsaveis] erro:', er)
    if (ero) console.error('[roles] erro:', ero)

    const usuariosData = (u as Usuario[]) ?? []
    setUsuarios(usuariosData)
    setSetores((s as Setor[]) ?? [])
    setRoles((ro as Role[]) ?? [])

    const emailsDeUsuarios = new Set(usuariosData.map(usr => usr.email.toLowerCase()))
    const semAcesso = ((r as Responsavel[]) ?? []).filter(resp => !emailsDeUsuarios.has(resp.email.toLowerCase()))
    setResponsaveisSemAcesso(semAcesso)

    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const setoresMap = useMemo(() => new Map(setores.map(s => [s.id, s.nome])), [setores])

  const openModal = (user: Usuario | null = null) => {
    setEditingUser(user)
    if (user) {
      setFormData({
        email: user.email,
        nome: user.nome ?? '',
        role_slug: user.role ?? 'user',
        id_setor: user.id_setor ?? '',
        password: '',
      })
    } else {
      setFormData({ email: '', nome: '', role_slug: 'user', id_setor: '', password: '' })
    }
    setIsModalOpen(true)
  }
  
  const closeModal = () => setIsModalOpen(false)

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const handleSave = async () => {
    if (editingUser) { // Modo Edição
      const { error: errorUsuario } = await supabase
        .from('usuarios')
        .update({ nome: formData.nome.trim(), id_setor: formData.id_setor || null })
        .eq('id', editingUser.id)

      const { error: errorRole } = await supabase
        .from('usuarios_roles')
        .upsert({ user_id: editingUser.id, role_slug: formData.role_slug })

      if (errorUsuario || errorRole) {
        toast.error('Erro ao atualizar usuário.')
        console.error('Update error:', errorUsuario || errorRole)
      } else {
        toast.success('Usuário atualizado com sucesso!')
      }

    } else { // Modo Criação
      if (!formData.email || !formData.nome) {
        return toast.error('Preencha Email e Nome.')
      }
      
      const { data, error } = await supabase.functions.invoke('create-user', {
        method: 'POST',
        body: {
          email: formData.email.trim(),
          password: formData.password,
          nome: formData.nome.trim(),
          role_slug: formData.role_slug,
          id_setor: formData.id_setor || null,
        },
      })

      if (error) {
        toast.error('Erro ao criar usuário', { description: error.message })
        console.error('[invoke-create] erro:', error)
      } else {
        toast.success('Usuário criado com sucesso!')
      }
    }
    closeModal()
    fetchAll()
  }
  
  const confirmDelete = async () => {
    if (!deletingUser) return
    const { data, error } = await supabase.functions.invoke('delete-user', { body: { id: deletingUser.id } })
    if (error) {
      toast.error(`Erro ao excluir ${deletingUser.email}`, { description: error.message })
    } else {
      toast.success('Usuário excluído com sucesso!')
    }
    setDeletingUser(null)
    fetchAll()
  }

  const convidarResponsavel = async (responsavel: Responsavel) => {
    const { nome, email, id_setor } = responsavel
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email, nome, role_slug: 'user', id_setor },
    })

    if (error) {
      toast.error(`Erro ao convidar ${nome}`, { description: error.message })
    } else {
      toast.success(`Convite enviado para ${nome}!`)
    }
    fetchAll()
  }

  if (loadingAuth) return <div className="p-6 text-center">Verificando permissões...</div>
  if (userRole !== 'admin') {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center h-96">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground mt-2">Você não tem permissão para acessar esta página.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configurações – Usuários</h1>
        <Button onClick={() => openModal()}>
          <Plus className="mr-2" size={16} /> Adicionar usuário
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-4">
          {loading ? ( <div className="text-sm text-gray-500">Carregando…</div> ) 
                   : usuarios.length === 0 ? ( <div className="text-sm text-gray-500">Nenhum usuário encontrado.</div>) 
                   : (
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
                  <div className="col-span-2 capitalize">{u.role ?? '—'}</div>
                  <div className="col-span-2">{setoresMap.get(u.id_setor || '') ?? '—'}</div>
                  <div className="col-span-1">{u.confirmado ? '✔️' : '❌'}</div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button variant="outline" size="icon" onClick={() => openModal(u)}><Pencil size={16} /></Button>
                    <Button variant="destructive" size="icon" onClick={() => setDeletingUser(u)}><Trash2 size={16} /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {responsaveisSemAcesso.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Responsáveis sem Acesso</CardTitle>
            <p className="text-sm text-muted-foreground">
              Estes são responsáveis cadastrados no sistema que ainda não possuem um login. Envie um convite para que possam acessar a plataforma.
            </p>
          </CardHeader>
          <CardContent className="p-4">
             <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">
                  <div className="col-span-4">Nome</div>
                  <div className="col-span-4">Email</div>
                  <div className="col-span-4 text-right">Ação</div>
                </div>
                {responsaveisSemAcesso.map(r => (
                  <div key={r.id} className="grid grid-cols-12 px-4 py-2 border-t items-center text-sm">
                    <div className="col-span-4 truncate font-medium">{r.nome}</div>
                    <div className="col-span-4 truncate">{r.email}</div>
                    <div className="col-span-4 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => convidarResponsavel(r)}>
                        <Send size={14} className="mr-2" /> Convidar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar usuário' : 'Adicionar usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input value={formData.email} onChange={(e) => handleFormChange('email', e.target.value)} disabled={!!editingUser} />
            </div>
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={formData.nome} onChange={(e) => handleFormChange('nome', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <select className="w-full h-10 border rounded-md px-3 bg-white" value={formData.role_slug} onChange={(e) => handleFormChange('role_slug', e.target.value)}>
                {roles.map(r => (
                  <option key={r.slug} value={r.slug}>{r.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Setor</label>
              <select className="w-full h-10 border rounded-md px-3 bg-white" value={formData.id_setor} onChange={(e) => handleFormChange('id_setor', e.target.value)}>
                <option value="">— sem setor —</option>
                {setores.map(s => (<option key={s.id} value={s.id}>{s.nome}</option>))}
              </select>
            </div>
            {!editingUser && (
              <div>
                <label className="text-sm font-medium">Senha (opcional)</label>
                <Input type="password" placeholder="Se vazio, um convite será enviado" value={formData.password} onChange={(e) => handleFormChange('password', e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSave}>{editingUser ? 'Salvar Alterações' : 'Criar usuário'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir "{deletingUser?.email}"?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setDeletingUser(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Confirmar Exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}