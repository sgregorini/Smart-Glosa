// components/AnexosEtapa.tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Anexo {
  id: string
  nome_arquivo: string
  caminho: string
  criado_em: string
  criado_por: string
  usuario_nome?: string
}

export default function AnexosEtapa({ etapaId }: { etapaId: string }) {
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [uploading, setUploading] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)

  const [anexoParaExcluir, setAnexoParaExcluir] = useState<Anexo | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  async function fetchAnexos() {
    const { data, error } = await supabase
      .from('anexos_etapas')
      .select('*, usuarios(nome)')
      .eq('etapa_id', etapaId)
      .order('criado_em', { ascending: false })

    if (error) console.error('Erro ao carregar anexos:', error)
    else {
      const formatados = data.map((a: any) => ({
        ...a,
        usuario_nome: a.usuarios?.nome || 'Usuário'
      }))
      setAnexos(formatados)
    }
  }

  async function handleUpload() {
    if (!arquivo) return
    const usuarioId = localStorage.getItem('usuario_id')
    const ext = arquivo.name.split('.').pop()
    const nomeArmazenado = `${etapaId}/${Date.now()}.${ext}`

    setUploading(true)

    const { error: storageError } = await supabase.storage
      .from('anexos')
      .upload(nomeArmazenado, arquivo)

    if (storageError) {
      console.error('Erro ao enviar arquivo:', storageError)
      setUploading(false)
      return
    }

    const { error: insertError } = await supabase.from('anexos_etapas').insert({
      etapa_id: etapaId,
      nome_arquivo: arquivo.name,
      caminho: nomeArmazenado,
      criado_por: usuarioId
    })

    if (insertError) {
      console.error('Erro ao salvar metadados:', insertError)
    }

    setArquivo(null)
    await fetchAnexos()
    setUploading(false)
  }

    async function baixar(caminho: string, nome: string) {
        const { data } = supabase.storage.from('anexos').getPublicUrl(caminho)
        const response = await fetch(data.publicUrl)

        if (!response.ok) {
            console.error('Erro ao baixar o arquivo')
            return
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', nome)
        document.body.appendChild(link)
        link.click()
        link.remove()
    }

  useEffect(() => {
    fetchAnexos()
  }, [etapaId])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative group">
            <input
            id="upload-file"
            type="file"
            onChange={(e) => setArquivo(e.target.files?.[0] || null)}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            <Button
            type="button"
            variant="outline"
            className="transition-all group-hover:ring-2 group-hover:ring-brand group-hover:scale-105"
            >
            Selecionar Arquivo
            </Button>
        </div>

        <span className="text-sm text-gray-600">
            {arquivo ? arquivo.name : 'Nenhum arquivo selecionado'}
        </span>

        <Button onClick={handleUpload} disabled={uploading || !arquivo}>
            {uploading ? 'Enviando…' : 'Anexar'}
        </Button>
        <Dialog open={!!anexoParaExcluir} onOpenChange={(open) => !open && setAnexoParaExcluir(null)}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Excluir anexo</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-gray-600">
                Tem certeza que deseja excluir o anexo{' '}
                <span className="font-medium text-gray-800">{anexoParaExcluir?.nome_arquivo}</span>?
                </p>
                <DialogFooter className="pt-4">
                <Button variant="ghost" onClick={() => setAnexoParaExcluir(null)} disabled={excluindo}>
                    Cancelar
                </Button>
                <Button
                    variant="destructive"
                    onClick={async () => {
                    if (!anexoParaExcluir) return
                    setExcluindo(true)

                    const { error: storageError } = await supabase.storage
                        .from('anexos')
                        .remove([anexoParaExcluir.caminho])
                    if (storageError) {
                        console.error('Erro ao remover do storage:', storageError)
                        setExcluindo(false)
                        return
                    }

                    const { error: deleteError } = await supabase
                        .from('anexos_etapas')
                        .delete()
                        .eq('id', anexoParaExcluir.id)
                    if (deleteError) {
                        console.error('Erro ao remover metadados:', deleteError)
                        setExcluindo(false)
                        return
                    }

                    await fetchAnexos()
                    setAnexoParaExcluir(null)
                    setExcluindo(false)
                    }}
                    disabled={excluindo}
                >
                    {excluindo ? 'Excluindo…' : 'Excluir'}
                </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>

        </div>




      <ul className="space-y-2">
        {anexos.map((a) => (
            <li key={a.id} className="flex items-center justify-between bg-gray-50 border px-4 py-2 rounded">
            <div>
                <div className="font-medium text-sm">{a.nome_arquivo}</div>
                <div className="text-xs text-gray-500">
                {new Date(a.criado_em).toLocaleDateString()} • {a.usuario_nome}
                </div>
            </div>
            <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => baixar(a.caminho, a.nome_arquivo)}>
                Baixar
                </Button>
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setAnexoParaExcluir(a)}
                    >
                    Excluir
                    </Button>

            </div>
            </li>
        ))}
        </ul>
    </div>
  )
}
