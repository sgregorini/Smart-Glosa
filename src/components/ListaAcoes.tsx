import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface AcaoDetalhada {
  id: string
  acao_descricao: string
  pda_id_original: string
  nm_status_acao: string
  total_etapas: number
  etapas_concluidas: number
  progresso_percentual: number
}

export default function ListaAcoes() {
  const [acoes, setAcoes] = useState<AcaoDetalhada[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAcoes() {
      const { data, error } = await supabase
        .from('vw_acoes_detalhadas')
        .select('*')
        .order('progresso_percentual', { ascending: false })

      if (error) {
        console.error(error)
        return
      }

      setAcoes(data as AcaoDetalhada[])
      setLoading(false)
    }

    fetchAcoes()
  }, [])

  if (loading) return <p>Carregando ações...</p>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {acoes.map((acao) => (
        <Card key={acao.id} className="shadow-sm">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-lg font-semibold">{acao.acao_descricao}</h3>
            <p className="text-sm text-muted-foreground">
              {acao.pda_id_original}
            </p>

            <Badge variant="outline">{acao.nm_status_acao}</Badge>

            <div className="pt-2">
              <Progress value={acao.progresso_percentual} />
              <p className="text-xs text-muted-foreground mt-1">
                {acao.etapas_concluidas} de {acao.total_etapas} etapas concluídas (
                {acao.progresso_percentual}%)
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
