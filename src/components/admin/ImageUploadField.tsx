"use client"

import { ImagePlus, X } from "lucide-react"
import { useRef, useState } from "react"
import { isImageFile, uploadImageToConvex } from "@/lib/convex-image-upload"
import { cn } from "@/lib/utils"

type ImageUploadFieldProps = {
  imageUrl: string | null
  label: string
  chooseLabel?: string
  clearLabel?: string
  size?: "sm" | "md"
  disabled?: boolean
  onUpload: (file: File) => Promise<void>
  onClear: () => Promise<void>
}

export function ImageUploadField({
  imageUrl,
  label,
  chooseLabel = "Choisir…",
  clearLabel = "Supprimer",
  size = "md",
  disabled = false,
  onUpload,
  onClear,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const boxClass = size === "sm" ? "size-14" : "size-24"

  const handleFile = (file: File | undefined) => {
    if (!file || !isImageFile(file)) return
    void (async () => {
      setBusy(true)
      try {
        await onUpload(file)
      } finally {
        setBusy(false)
        if (inputRef.current) inputRef.current.value = ""
      }
    })()
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wider text-neutral-400">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "shrink-0 overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-neutral-200",
            boxClass,
          )}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-neutral-300">
              <ImagePlus className={size === "sm" ? "size-5" : "size-6"} aria-hidden />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 disabled:opacity-40"
          >
            {chooseLabel}
          </button>
          <button
            type="button"
            disabled={disabled || busy || !imageUrl}
            onClick={() => void onClear()}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-neutral-500 disabled:opacity-40"
          >
            {clearLabel}
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}

export type ConvexImageUploadHandlers = {
  generateUploadUrl: () => Promise<string>
  setStorageId: (storageId: string) => Promise<void>
  clear: () => Promise<void>
}

export async function uploadViaConvexStorage(
  file: File,
  handlers: ConvexImageUploadHandlers,
): Promise<void> {
  const uploadUrl = await handlers.generateUploadUrl()
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  })
  if (!response.ok) {
    throw new Error("Échec de l’envoi de l’image")
  }
  const body = (await response.json()) as { storageId?: string }
  if (!body.storageId) throw new Error("Identifiant de stockage introuvable")
  await handlers.setStorageId(body.storageId)
}
