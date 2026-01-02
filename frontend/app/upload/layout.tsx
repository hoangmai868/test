import type React from "react"
import { UploadProvider } from "@/contexts/upload-context"
import UploadStepper from "@/components/upload-stepper"

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UploadProvider>
      <UploadStepper />
      {children}
    </UploadProvider>
  )
}
