// src/components/ModalAdicionarResponsavel.tsx
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Responsavel } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onResponsavelCriado: (novoResponsavel: Responsavel) => void
}

export default function ModalAdicionarResponsavel({ open, onClose, onResponsavelCriado }: Props) {
  const { currentOrgId } = useAuth() // Pega o id_setor do usuário logado
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSalvar = async () => {
    if (!nome.trim() || !email.trim()) {
      toast.error('Nome e email são obrigatórios.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('responsaveis')
        .insert({
          nome: nome.trim(),
          email: email.trim(),
          id_setor: currentOrgId, // Vincula o novo responsável ao setor do usuário atual
        })
        .select()
        .single()

      if (error) throw error

      toast.success(`Responsável "${data.nome}" criado com sucesso!`)
      onResponsavelCriado(data as Responsavel)
      handleClose()
    } catch (err: any) {
      console.error('Erro ao criar responsável:', err)
      toast.error('Erro ao criar responsável', { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setNome('')
    setEmail('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Novo Responsável</DialogTitle>
          <DialogDescription>
            Crie um novo responsável que ficará disponível para seleção.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome-responsavel">Nome</Label>
            <Input id="nome-responsavel" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-responsavel">Email</Label>
            <Input
              id="email-responsavel"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar Responsável'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}