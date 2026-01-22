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

interface ConfirmDeleteFileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  fileName?: string
}

export default function ConfirmDeleteFileModal({
  open,
  onOpenChange,
  onConfirm,
  fileName,
}: ConfirmDeleteFileModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>ファイルを削除しますか？</DialogTitle>
          <DialogDescription>
            {fileName ? (
              <span className="text-sm text-slate-700">
                「{fileName}」を削除します。よろしいですか？
              </span>
            ) : (
              "対象のファイルを削除します。よろしいですか？"
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={onConfirm}>削除</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

