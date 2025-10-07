// src/pages/Configuracoes/MeuPerfil.tsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

// ===== helpers =====
const isEmail = (s?: string | null) => !!s && /\S+@\S+\.\S+/.test(s || '')
const emailToNiceName = (email?: string | null) => {
  if (!email) return ''
  const local = email.split('@')[0] || ''
  return local
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
const initialsFromName = (name?: string | null) => {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => (p[0] || '').toUpperCase()).join('') || 'U'
}

export default function MeuPerfil() {
  const { user, usuarioDetalhes, refreshUsuarioDetalhes, refreshUser } = useAuth()

  const preferredName = useMemo(() => {
    const fromProfile = usuarioDetalhes?.nome
    const fromAuth =
      (user?.user_metadata?.full_name as string | undefined) ||
      (user?.user_metadata?.name as string | undefined)

    if (fromProfile && !isEmail(fromProfile)) return fromProfile
    if (fromAuth && !isEmail(fromAuth)) return fromAuth
    return emailToNiceName(user?.email) || ''
  }, [usuarioDetalhes?.nome, user?.user_metadata, user?.email])

  const preferredAvatar = useMemo(() => {
    return (
      usuarioDetalhes?.foto_url ||
      (user?.user_metadata?.avatar_url as string | undefined) ||
      (user?.user_metadata?.picture as string | undefined) ||
      null
    )
  }, [usuarioDetalhes?.foto_url, user?.user_metadata])

  // estado do formulário
  const [nome, setNome] = useState('')
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')

  const [loadingPerfil, setLoadingPerfil] = useState(false)
  const [loadingSenha, setLoadingSenha] = useState(false)
  const [uploading, setUploading] = useState(false)

  // inicializa uma vez quando as fontes chegam
  useEffect(() => {
    setNome(prev => (prev ? prev : preferredName))
    setFotoUrl(prev => (prev ? prev : preferredAvatar))
  }, [preferredName, preferredAvatar])

  // ===== salvar nome (RPC atômico) =====
  const salvarPerfil = async () => {
    if (!user) return
    const nomeTrimmed = (nome || '').trim()
    if (!nomeTrimmed) {
      toast.error('Informe um nome válido.')
      return
    }

    setLoadingPerfil(true)
    try {
      const { error } = await supabase.rpc('sync_profile', {
        p_user_id: user.id,
        p_name: nomeTrimmed,
        p_avatar_url: null
      })
      if (error) throw error

      await Promise.allSettled([refreshUsuarioDetalhes(), refreshUser()])
      toast.success('Perfil atualizado com sucesso!')
    } catch (e: any) {
      toast.error(`Erro ao salvar perfil: ${e.message || e.toString()}`)
    } finally {
      setLoadingPerfil(false)
    }
  }

  // ===== alterar senha =====
  const alterarSenha = async () => {
    if (!user) return
    if (!senhaAtual || !novaSenha) {
      toast.error('Preencha senha atual e nova senha.')
      return
    }
    setLoadingSenha(true)
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: senhaAtual
      })
      if (loginError) {
        toast.error('Senha atual incorreta.')
        return
      }
      const { error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) throw error

      setSenhaAtual('')
      setNovaSenha('')
      toast.success('Senha alterada com sucesso!')
    } catch (e: any) {
      toast.error(`Erro ao alterar senha: ${e.message || e.toString()}`)
    } finally {
      setLoadingSenha(false)
    }
  }

  // ===== upload de avatar (Storage + RPC) =====
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return
    setUploading(true)
    try {
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = data.publicUrl

      // atualiza tudo via RPC (mantendo nome atual ou fallback seguro)
      const currentName =
        nome ||
        usuarioDetalhes?.nome ||
        (user?.user_metadata?.full_name as string | undefined) ||
        user?.email ||
        ''
      const { error: rpcErr } = await supabase.rpc('sync_profile', {
        p_user_id: user.id,
        p_name: currentName,
        p_avatar_url: publicUrl
      })
      if (rpcErr) throw rpcErr

      setFotoUrl(publicUrl)
      await Promise.allSettled([refreshUsuarioDetalhes(), refreshUser()])
      toast.success('Foto de perfil atualizada!')
    } catch (e: any) {
      toast.error(`Erro ao enviar foto: ${e.message || e.toString()}`)
    } finally {
      setUploading(false)
      // permite reupload do mesmo arquivo
      e.currentTarget.value = ''
    }
  }

  const avatarInitials = initialsFromName(nome || preferredName)

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Meu Perfil</h1>

      {/* Card Perfil */}
      <Card>
        <CardHeader className="flex flex-col items-center space-y-3">
          <Avatar className="h-20 w-20">
            <AvatarImage src={fotoUrl ?? ''} alt="Avatar" />
            <AvatarFallback className="bg-brand text-white text-xl">
              {avatarInitials}
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
            <Input
              value={nome}
              placeholder={preferredName || 'Seu nome'}
              onChange={(e) => setNome(e.target.value)}
            />
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
              onChange={(e) => setSenhaAtual(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nova Senha</label>
            <Input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              autoComplete="new-password"
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
