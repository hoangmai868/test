"use client"

import type React from "react"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState, useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import { useUploadContext } from "@/contexts/upload-context"
import Step2FileMappingScreen from "@/components/screens/files-mapping"
import UploadFiles from "@/components/screens/upload-files"
import Preview from "@/components/screens/preview"

function UploadContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const step = searchParams.get("step") || "1"
  const urlJobId = searchParams.get("jobId")
  const { 
    uploadedFiles, 
    loadedFileInfo,
    fieldMappings, 
    setFieldMappings, 
    jobId, 
    canAccessStep,
    loadJobData,
    isLoadingJob,
    resetContext,
    setDeletedFiles,
  } = useUploadContext()
  const [loadedJobId, setLoadedJobId] = useState<string | null>(null)
  
  const [dragStates, setDragStates] = useState<{
    customerInfo: boolean
    contractDocs: boolean
    registryDocs: boolean
  }>({
    customerInfo: false,
    contractDocs: false,
    registryDocs: false,
  })

  // Use drag counters to prevent flickering when entering child elements
  const dragCounters = useRef<{
    customerInfo: number
    contractDocs: number
    registryDocs: number
  }>({
    customerInfo: 0,
    contractDocs: 0,
    registryDocs: 0,
  })

  const customerInfoRef = useRef<HTMLInputElement>(null)
  const contractDocsRef = useRef<HTMLInputElement>(null)
  const registryDocsRef = useRef<HTMLInputElement>(null)

  const buildStepUrl = (stepValue: number | string) => {
    const id = urlJobId || jobId
    return id ? `/upload?step=${stepValue}&jobId=${id}` : `/upload?step=${stepValue}`
  }

  // Load job data when jobId is in URL (edit mode)
  useEffect(() => {
    const loadJob = async () => {
      if (urlJobId && urlJobId !== loadedJobId) {
        try {
          // Clear stale state from previous sessions/jobs before loading
          resetContext()
          setDeletedFiles({
            customerInfo: new Set(),
            contractDocs: new Set(),
            registryDocs: new Set(),
          })
          await loadJobData(urlJobId)
          setLoadedJobId(urlJobId)
        } catch (error) {
          console.error("Failed to load job:", error)
          // Redirect to step 1 without jobId if loading fails
          router.push("/upload?step=1")
        }
      }
    }
    loadJob()
  }, [urlJobId, loadedJobId, loadJobData, resetContext, router, setDeletedFiles])

  // Reset loadedJobId when navigating away (no jobId in URL)
  useEffect(() => {
    if (!urlJobId && loadedJobId) {
      setLoadedJobId(null)
      setDeletedFiles({
        customerInfo: new Set(),
        contractDocs: new Set(),
        registryDocs: new Set(),
      })
    }
  }, [urlJobId, loadedJobId, setDeletedFiles])

  useEffect(() => {
    const currentStepNum = Number.parseInt(step)
    const isHydratingStep2 =
      currentStepNum === 2 && Boolean(urlJobId) && loadedJobId !== urlJobId
    if (isHydratingStep2) {
      return
    }
    if (!canAccessStep(currentStepNum) && !isLoadingJob) {
      router.push(buildStepUrl(1))
    }
  }, [step, canAccessStep, router, isLoadingJob, urlJobId, jobId, loadedJobId])

  if (isLoadingJob) {
    return (
      <div className="bg-slate-50 p-4 sm:p-6 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">ジョブデータを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (step === "1") {
    return (
      <UploadFiles
        onNext={(draftJobId) => {
          router.push(draftJobId ? `/upload?step=2&jobId=${draftJobId}` : "/upload?step=2")
        }}
      />
    )
  }

  if (step === "2") {
    return (
      <div className="bg-slate-50">
        <Step2FileMappingScreen
          uploadedFiles={uploadedFiles}
          loadedFileInfo={loadedFileInfo}
          fieldMappings={fieldMappings}
          setFieldMappings={setFieldMappings}
          onBack={() => router.push(jobId ? `/upload?step=1&jobId=${jobId}` : "/upload?step=1")}
          onNext={() => router.push(jobId ? `/upload?step=3&jobId=${jobId}` : "/upload?step=3")}
          canProceed={canAccessStep(3)}
        />
      </div>
    )
  }

  if (step === "3") {
    return <Preview jobId={jobId} />
  }

  return null
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <UploadContent />
    </Suspense>
  )
}

