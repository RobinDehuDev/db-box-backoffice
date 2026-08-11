"use client"

import Link from "next/link"
import { useConvex, useMutation, useQuery } from "convex/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  type CategoryKey,
} from "@/lib/categories"
import {
  folderNameFromFileList,
  itemsFromFileList,
  LIBRARY_ROOT_KEY,
} from "@/lib/library-import"
import { setLocalFile } from "@/lib/local-file-cache"

const AUDIO_EXT = new Set([
  ".mp3",
  ".wav",
  ".flac",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
])

function fileKeyFromInputFile(file: File): string {
  const rel =
    "webkitRelativePath" in file &&
    typeof file.webkitRelativePath === "string" &&
    file.webkitRelativePath
      ? file.webkitRelativePath
      : ""
  return rel || file.name
}

function isLikelyAudioFile(file: File): boolean {
  const name = file.name.toLowerCase()
  const ext = name.slice(name.lastIndexOf("."))
  return AUDIO_EXT.has(ext)
}

type SubOption = {
  _id: Id<"subcategories">
  name: string
  tag: string
  categoryKey: CategoryKey
  categoryLabel: string
}

export default function TapesPage() {
  const convex = useConvex()
  const tapes = useQuery(api.tapes.list)
  const importMany = useMutation(api.tapes.importMany)
  const syncScan = useMutation(api.tapes.syncScan)
  const addTapeToSub = useMutation(api.subcategories.addTape)
  const removeTape = useMutation(api.tapes.remove)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)

  const [libraryRoot, setLibraryRoot] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<{
    added: number
    updated: number
    removed: number
    total: number
  } | null>(null)
  const [addTapeId, setAddTapeId] = useState<Id<"tapes"> | null>(null)
  const [subOptions, setSubOptions] = useState<SubOption[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(LIBRARY_ROOT_KEY)
    if (stored) setLibraryRoot(stored)
  }, [])

  const openAddToSub = useCallback(
    async (tapeId: Id<"tapes">) => {
      const options: SubOption[] = []
      for (const key of CATEGORY_KEYS) {
        const list = await convex.query(api.subcategories.listByCategory, {
          categoryKey: key,
        })
        for (const sub of list) {
          options.push({
            _id: sub._id,
            name: sub.name,
            tag: sub.tag,
            categoryKey: key,
            categoryLabel: CATEGORY_LABELS[key],
          })
        }
      }
      setSubOptions(options)
      setAddTapeId(tapeId)
    },
    [convex],
  )

  const handleFiles = async (
    files: FileList,
    mode: "import" | "folder" | "scan",
  ) => {
    // Same-tab UX: carry selected File objects to the cue editor page.
    // We only need them in memory (no uploads).
    for (const file of Array.from(files)) {
      if (!isLikelyAudioFile(file)) continue
      const key = fileKeyFromInputFile(file).trim()
      if (key) setLocalFile(key, file)
    }

    const items = itemsFromFileList(files)
    if (items.length === 0) {
      setMessage("Aucun fichier audio trouvé.")
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      if (mode === "scan") {
        const titles: Record<string, string> = {}
        for (const item of items) titles[item.localFileKey] = item.title
        const result = await syncScan({
          keys: items.map((i) => i.localFileKey),
          titles,
        })
        setScanResult(result)
      } else {
        const result = await importMany({ items })
        if (result.imported > 0) {
          setMessage(
            `${result.imported} fichier${result.imported === 1 ? "" : "s"} importé${result.imported === 1 ? "" : "s"}`,
          )
        }
      }
      if (mode === "folder" || mode === "scan") {
        const folder = folderNameFromFileList(files)
        if (folder) {
          localStorage.setItem(LIBRARY_ROOT_KEY, folder)
          setLibraryRoot(folder)
        }
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Échec")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-champagne-deep">
          Bibliothèque
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Bibliothèque</h1>
        <p className="mt-2 text-neutral-500">
          Ajoutez des bandes ou scannez un dossier, puis timecodez-les dans
          l’éditeur de cues.
        </p>
      </header>

      <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files
              e.target.value = ""
              if (files?.length) void handleFiles(files, "import")
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={(e) => {
              const files = e.target.files
              e.target.value = ""
              if (files?.length) void handleFiles(files, "folder")
            }}
          />
          <input
            ref={scanInputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={(e) => {
              const files = e.target.files
              e.target.value = ""
              if (files?.length) void handleFiles(files, "scan")
            }}
          />
          <button
            type="button"
            disabled={busy}
            className="min-h-12 rounded-full bg-neutral-800 px-5 font-semibold text-white disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()}
          >
            Ajouter des fichiers…
          </button>
          <button
            type="button"
            disabled={busy}
            className="min-h-12 rounded-full bg-neutral-200 px-5 font-semibold disabled:opacity-50"
            onClick={() => folderInputRef.current?.click()}
          >
            Choisir un dossier
          </button>
          <button
            type="button"
            disabled={busy}
            className="min-h-12 rounded-full bg-neutral-200 px-5 font-semibold disabled:opacity-50"
            onClick={() => scanInputRef.current?.click()}
          >
            {busy ? "Scan…" : "Scanner le dossier"}
          </button>
        </div>
        {libraryRoot ? (
          <p className="mt-3 break-all text-xs text-neutral-400">
            Dossier bibliothèque (scan) : {libraryRoot}
          </p>
        ) : null}
        {scanResult ? (
          <p className="mt-2 text-sm text-neutral-600">
            {scanResult.added} ajoutés · {scanResult.updated} mis à jour ·{" "}
            {scanResult.removed} retirés · {scanResult.total} total
          </p>
        ) : null}
        {message ? <p className="mt-2 text-sm text-neutral-600">{message}</p> : null}
      </section>

      <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Bandes / playlists</h2>
        {!tapes ? (
          <p className="mt-4 text-sm text-neutral-500">Chargement…</p>
        ) : tapes.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            Aucun fichier. Scannez le dossier SSD.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {tapes.map((tape) => (
              <li
                key={tape._id}
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/tapes/${tape._id}/cues`}
                    className="truncate font-semibold touch-manipulation"
                  >
                    {tape.title}
                  </Link>
                  <p className="mt-1 text-sm text-neutral-400">
                    {tape.cueCount} cue{tape.cueCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                  <button
                    type="button"
                    className="text-sm font-semibold text-neutral-700"
                    onClick={() => void openAddToSub(tape._id)}
                  >
                    Ajouter à une sous-catégorie
                  </button>
                  <Link
                    href={`/tapes/${tape._id}/cues`}
                    className="text-sm font-semibold text-champagne-deep"
                  >
                    Éditer les cues
                  </Link>
                  <button
                    type="button"
                    className="text-sm font-semibold text-red-600"
                    disabled={busy}
                    onClick={() => {
                      void (async () => {
                        const ok = window.confirm(
                          `Supprimer "${tape.title}" ? Cela supprimera aussi ses cues.`,
                        )
                        if (!ok) return
                        setBusy(true)
                        try {
                          await removeTape({ tapeId: tape._id })
                          setMessage("Bande supprimée")
                        } finally {
                          setBusy(false)
                        }
                      })()
                    }}
                    aria-label={`Supprimer ${tape.title}`}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {addTapeId != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Choisir une sous-catégorie</h3>
              <button
                type="button"
                className="text-sm font-semibold text-neutral-500"
                onClick={() => setAddTapeId(null)}
              >
                Fermer
              </button>
            </div>
            {subOptions.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">
                Aucune sous-catégorie. Créez-en une dans Catégories.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {subOptions.map((sub) => (
                  <li key={sub._id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-neutral-50 px-4 py-3 text-left touch-manipulation active:scale-[0.99]"
                      onClick={() => {
                        void addTapeToSub({
                          subcategoryId: sub._id,
                          tapeId: addTapeId,
                        }).then(() => {
                          setAddTapeId(null)
                          setMessage("Ajouté à la sous-catégorie")
                        })
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {sub.name}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {sub.categoryLabel}
                          {sub.tag ? ` · ${sub.tag}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
