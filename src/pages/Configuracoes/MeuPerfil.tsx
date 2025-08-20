// src/pages/Configuracoes/MeuPerfil.tsx
import { useAuth } from '@/context/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function MeuPerfil() {
  const { user, perfil } = useAuth()
  const [nome, setNome] = useState('')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [loadingPerfil, setLoadingPerfil] = useState(false)
  const [loadingSenha, setLoadingSenha] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

useEffect(() => {
  if (perfil?.nome && perfil.nome.trim()) setNome(perfil.nome)
  else if (user?.user_metadata?.full_name) setNome(user.user_metadata.full_name)
  else if (user?.email) setNome(String(user.email).split('@')[0])

  if (perfil?.foto_url) setFotoUrl(perfil.foto_url)
}, [perfil, user])

  const getInitials = (fullName?: string | null) => {
    if (!fullName) return 'U'
    const parts = fullName.trim().split(/\s+/)
    return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
  }

  // salvar nome
  const salvarPerfil = async () => {
    if (!user) return
    setLoadingPerfil(true)
    const { error } = await supabase
      .from('usuarios')
      .update({ nome })
      .eq('id', user.id)

    if (error) toast.error('Erro ao salvar perfil: ' + error.message)
    else {
      toast.success('Perfil atualizado com sucesso!')
      // re-carrega o perfil do contexto
      const { data } = await supabase
        .from('usuarios')
        .select('id, nome, cargo, criado_em:created_at, foto_url, role, id_setor')
        .eq('id', user.id)
        .maybeSingle()
      // atualiza somente a foto/nome locais (já resolve a UI)
      if (data?.nome) setNome(data.nome)
      if (data?.foto_url) setFotoUrl(data.foto_url)
    }

    setLoadingPerfil(false)
  }


  // alterar senha
  const alterarSenha = async () => {
    if (!user) return
    setLoadingSenha(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: senhaAtual,
    })
    if (loginError) {
      toast.error('Senha atual incorreta.')
      setLoadingSenha(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) toast.error('Erro ao alterar senha: ' + error.message)
    else {
      toast.success('Senha alterada com sucesso!')
      setSenhaAtual('')
      setNovaSenha('')
    }
    setLoadingSenha(false)
  }

  // upload de avatar
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!user || !e.target.files?.[0]) return
      setUploading(true)

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/avatar.${fileExt}`

      // 1. Faz upload no bucket "avatars"
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // 2. Gera URL pública
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = data.publicUrl

      // 3. Atualiza na tabela usuarios
      const { error: dbError } = await supabase
        .from('usuarios')
        .update({ foto_url: publicUrl })
        .eq('id', user.id)

      if (dbError) throw dbError

      setFotoUrl(publicUrl)
      toast.success('Foto de perfil atualizada!')
    } catch (err: any) {
      toast.error('Erro ao enviar foto: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Meu Perfil</h1>

      {/* Card Perfil */}
      <Card>
        <CardHeader className="flex flex-col items-center space-y-3">
          <Avatar className="h-20 w-20">
            <AvatarImage src={fotoUrl ?? perfil?.foto_url ?? ''} alt="Avatar" />
            <AvatarFallback className="bg-brand text-white text-xl">
              {getInitials(nome || user?.email)}
            </AvatarFallback>
          </Avatar>

          <label className="text-xs text-blue-600 cursor-pointer hover:underline">
            {uploading ? 'Enviando...' : 'Trocar foto'}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>

          <CardTitle>Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <Input value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input value={user?.email || ''} disabled className="bg-gray-100" />
          </div>
          <Button onClick={salvarPerfil} disabled={loadingPerfil} className="w-full">
            {loadingPerfil ? 'Salvando…' : 'Salvar Perfil'}
          </Button>
        </CardContent>
      </Card>

      {/* Card Senha */}
      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Senha Atual</label>
            <Input
              type="password"
              value={senhaAtual}
              onChange={e => setSenhaAtual(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nova Senha</label>
            <Input
              type="password"
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
            />
          </div>
          <Button
            variant="destructive"
            onClick={alterarSenha}
            disabled={loadingSenha}
            className="w-full"
          >
            {loadingSenha ? 'Alterando…' : 'Alterar Senha'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
