// components/AnexosEtapa.tsx
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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

// Defina o tamanho máximo do arquivo em Megabytes (MB)
const MAX_FILE_SIZE_MB = 50;

interface AnexosEtapaProps {
  etapaId: string;
  usuarioId: string;
  arquivo: File | null;
  setArquivo: (arquivo: File | null) => void;
}

export default function AnexosEtapa({ etapaId, usuarioId, arquivo, setArquivo }: AnexosEtapaProps) {
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [uploading, setUploading] = useState(false)
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);

  const [anexoParaExcluir, setAnexoParaExcluir] = useState<Anexo | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  async function fetchAnexos() {
    const { data, error } = await supabase
      .from('anexos_etapas')
      .select('*, vw_usuarios_detalhes(nome)')
      .eq('etapa_id', etapaId)
      .order('criado_em', { ascending: false })

    if (error) console.error('Erro ao carregar anexos:', error)
    else {
      const formatados = data.map((a: any) => ({ // Adicionado 'any' para simplicidade
        ...a, // Mantém todos os outros campos do anexo
        usuario_nome: a.vw_usuarios_detalhes?.nome || 'Usuário'
      }))
      setAnexos(formatados)
    }
  }

  async function handleUpload() {
    if (!arquivo || fileSizeError) {
      if (fileSizeError) {
        toast.error('Arquivo inválido', { description: fileSizeError });
      }
      return;
    }

    // Verificação de tamanho do arquivo no cliente
    const maxSizeInBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (arquivo.size > maxSizeInBytes) {
      toast.error('Arquivo muito grande', {
        description: `O tamanho máximo permitido é de ${MAX_FILE_SIZE_MB}MB.`
      });
      return
    }
    if (!usuarioId) return; // Garante que o usuário está logado
    const ext = arquivo.name.split('.').pop()
    const nomeArmazenado = `${etapaId}/${Date.now()}.${ext}`

    setUploading(true)

    const { error: storageError } = await supabase.storage
      .from('anexos')
      .upload(nomeArmazenado, arquivo)

    if (storageError) {
      console.error('Erro ao enviar arquivo:', storageError)
      toast.error('Erro ao enviar arquivo', {
        description: storageError.message,
      });
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
      toast.error('Erro ao salvar informações do arquivo', {
        description: insertError.message,
      });
    }

    setArquivo(null)
    setFileSizeError(null)
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
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setFileSizeError(null);
              if (file) {
                const maxSizeInBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
                if (file.size > maxSizeInBytes) {
                  setFileSizeError(`Arquivo excede o limite de ${MAX_FILE_SIZE_MB}MB`);
                  setArquivo(null);
                  // Limpa o valor do input para permitir selecionar o mesmo arquivo (corrigido) novamente
                  e.target.value = '';
                } else {
                  setArquivo(file);
                }
              } else {
                setArquivo(null);
              }
            }}
            accept=".csv, .pdf, .doc, .docx, .xls, .xlsx, .jpg, .jpeg, .png, .webp"
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

        <div className="flex flex-col">
          <span className="text-sm text-gray-600">
            {arquivo ? arquivo.name : 'Nenhum arquivo selecionado'}
          </span>
          {fileSizeError && <span className="text-xs text-red-500">{fileSizeError}</span>}
        </div>

        <Button onClick={handleUpload} disabled={uploading || !arquivo || !!fileSizeError}>
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
