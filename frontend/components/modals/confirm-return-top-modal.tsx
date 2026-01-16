"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ConfirmReturnTopModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export default function ConfirmReturnTopModal({
  open,
  onOpenChange,
  onConfirm,
}: ConfirmReturnTopModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>TOPへ戻る</DialogTitle>
          <DialogDescription>
            この画面で保存していない情報がある場合、戻る前に必ず保存してください。準備ができていれば、TOPページへ移動します。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={onConfirm}>TOPへ戻る</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


