// components/ComentariosEtapa.tsx
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Comentario {
  id: string
  mensagem: string
  criado_em: string
  criado_por: string
  usuario_nome?: string
}

export default function ComentariosEtapa({ etapaId }: { etapaId: string }) {
  const [mensagem, setMensagem] = useState('')
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function fetchComentarios() {
    const { data, error } = await supabase
      .from('comentarios_etapas')
      .select('*, usuarios(nome)')
      .eq('etapa_id', etapaId)
      .order('criado_em', { ascending: true })

    if (error) {
      console.error('Erro ao carregar comentários:', error)
    } else {
      const formatados = data.map((c: any) => ({
        id: c.id,
        mensagem: c.mensagem,
        criado_em: c.criado_em,
        criado_por: c.criado_por,
        usuario_nome: c.usuarios?.nome || 'Usuário'
      }))
      setComentarios(formatados)
    }
  }

  async function enviarComentario() {
    const usuarioId = localStorage.getItem('usuario_id')
    if (!mensagem.trim() || !usuarioId) return

    setLoading(true)
    const { error } = await supabase.from('comentarios_etapas').insert({
        etapa_id: etapaId,
        mensagem,
        criado_por: usuarioId
        })
        if (error) {
        console.error('Erro ao enviar comentário:', error)
        setLoading(false)
        return
        }
    setMensagem('')
    await fetchComentarios()
    setLoading(false)
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  useEffect(() => {
    fetchComentarios()
  }, [etapaId])

  return (
    <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
      <div className="space-y-3">
        {comentarios.map((c) => (
          <div key={c.id} className="bg-gray-50 p-3 rounded border">
            <div className="text-sm font-semibold text-gray-800">{c.usuario_nome}</div>
            <div className="text-sm text-gray-600">{c.mensagem}</div>
            <div className="text-xs text-gray-400 mt-1">{new Date(c.criado_em).toLocaleString()}</div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="pt-4 border-t space-y-2">
        <Input
          placeholder="Digite um comentário…"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
        />
        <Button onClick={enviarComentario} disabled={loading || !mensagem.trim()}>
          Enviar
        </Button>
      </div>
    </div>
  )
}
