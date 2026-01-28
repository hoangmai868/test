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

interface ConfirmSaveToTemplateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export default function ConfirmSaveToTemplateModal({
  open,
  onOpenChange,
  onConfirm,
}: ConfirmSaveToTemplateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>共通プロンプトに反映</DialogTitle>
          <DialogDescription>
            共通プロンプトに反映してもよろしいでしょうか。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            いいえ
          </Button>
          <Button onClick={onConfirm}>はい</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
