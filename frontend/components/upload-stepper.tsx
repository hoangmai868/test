"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { useUploadContext } from "@/contexts/upload-context"

interface Step {
  id: string
  name: string
  step: string
}

const steps: Step[] = [
  { id: "1", name: "データ取込", step: "1" },
  { id: "2", name: "登録ファイルと項目の紐づけ", step: "2" },
  { id: "3", name: "予約実行", step: "3" },
]

export function UploadStepper() {
  const searchParams = useSearchParams()
  const currentStep = searchParams.get("step") || "1"
  const currentStepIndex = steps.findIndex((step) => step.step === currentStep)
  const { canAccessStep } = useUploadContext()

  return (
    <nav aria-label="Progress" className="sticky top-0 z-20 border-b bg-white">
      <ol className="mx-auto grid max-w-7xl grid-cols-3 gap-4 px-6 py-4">
        {steps.map((step, stepIdx) => {
          const isComplete = stepIdx < currentStepIndex
          const isCurrent = stepIdx === currentStepIndex
          const isClickable = canAccessStep(stepIdx + 1)

          return (
            <li key={step.id} className="relative">
              {isClickable ? (
                <Link
                  href={`/upload?step=${step.step}`}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-4 py-2 transition-colors",
                    isCurrent ? "bg-blue-50" : "hover:bg-gray-50",
                  )}
                >
                  <span
                    className={cn(
                      "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 font-semibold transition-colors",
                      isComplete
                        ? "border-blue-600 bg-blue-600 text-white"
                        : isCurrent
                          ? "border-blue-600 bg-white text-blue-600"
                          : "border-gray-300 bg-white text-gray-500",
                    )}
                  >
                    {isComplete ? <Check className="size-5" /> : step.id}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isCurrent ? "text-blue-600" : isComplete ? "text-gray-900" : "text-gray-500",
                    )}
                  >
                    {step.name}
                  </span>
                </Link>
              ) : (
                <div className="relative flex items-center gap-3 px-4 py-2 opacity-50">
                  <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white font-semibold text-gray-500">
                    {step.id}
                  </span>
                  <span className="text-sm font-medium text-gray-500">{step.name}</span>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default UploadStepper
