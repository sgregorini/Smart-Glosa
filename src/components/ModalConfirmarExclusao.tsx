// components/ModalConfirmarExclusao.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ModalConfirmarExclusaoProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function ModalConfirmarExclusao({
  open,
  onClose,
  onConfirm,
}: ModalConfirmarExclusaoProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir Ação</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir esta ação? Todas as etapas associadas também serão removidas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => {
            onConfirm()
            onClose()
          }}>
            Confirmar Exclusão
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
