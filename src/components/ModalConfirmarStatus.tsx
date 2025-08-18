import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ModalConfirmarStatusProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  tipo: 'andamento' | 'concluido' | 'reabrir'
}

export default function ModalConfirmarStatus({
  open,
  onClose,
  onConfirm,
  tipo,
}: ModalConfirmarStatusProps) {
  const mensagens = {
    andamento: {
      titulo: 'Iniciar Etapa',
      texto: 'Tem certeza que deseja marcar esta etapa como "Em Andamento"?',
    },
    concluido: {
      titulo: 'Concluir Etapa',
      texto: 'Tem certeza que deseja marcar esta etapa como "Concluída"?',
    },
    reabrir: {
      titulo: 'Reabrir Etapa',
      texto: 'Deseja reabrir esta etapa e voltar ao status "Em Andamento"?',
    },
  }

  const msg = mensagens[tipo]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{msg.titulo}</DialogTitle>
          <DialogDescription>{msg.texto}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => {
            onConfirm()
            onClose()
          }}>
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
