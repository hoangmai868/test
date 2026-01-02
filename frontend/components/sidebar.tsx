"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

export default function Sidebar() {
  const pathname = usePathname()
  const isUploadSection = pathname.startsWith("/upload")

  return (
    <div className="fixed left-0 top-0 w-64 h-screen bg-white border-r flex flex-col z-40">
      <div className="p-4 border-b h-16 shadown-sm">
        <div className="flex items-center gap-3">
          <Image src="/images/aicross-logo.png" alt="AICross" width={120} height={32} className="h-8 w-auto" />
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
            pathname === "/" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          <Home className="h-5 w-5" />
          <span className="font-medium">TOP</span>
        </Link>

        <Link
          href="/upload?step=1"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
            isUploadSection ? "bg-primary/10 text-primary" : "hover:bg-muted",
          )}
        >
          <Upload className="h-5 w-5" />
          <span className="font-medium">Upload</span>
        </Link>
      </nav>
    </div>
  )
}
