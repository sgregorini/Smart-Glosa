import { Progress } from '@/components/ui/progress'

interface ProgressoEtapasProps {
  etapas: { nm_status_etapa?: string }[]
}

export default function ProgressoEtapas({ etapas }: ProgressoEtapasProps) {
  const total = etapas.length
  const concluídas = etapas.filter(et => et.nm_status_etapa === 'Concluído').length
  const percent = total === 0 ? 0 : Math.round((concluídas / total) * 100)

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">
        Progresso: {concluídas} de {total} ({percent}%)
      </p>
      <Progress value={percent} />
    </div>
  )
}