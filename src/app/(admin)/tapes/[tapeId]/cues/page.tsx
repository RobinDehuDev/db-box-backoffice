"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  LocalTapePlayer,
  type LocalTapePlayerHandle,
} from "@/components/admin/LocalTapePlayer"
import { TimecodeField } from "@/components/admin/TimecodeField"
import { parseCueSheet } from "@/lib/cue-sheet"
import { formatTimecode, parseTimecode } from "@/lib/timecode"
import { cn } from "@/lib/utils"
import { getLocalFile } from "@/lib/local-file-cache"

type Draft = {
  title: string
  artist: string
  start: string
  end: string
  transitionStart: string
  transitionEnd: string
}

type TimeField = keyof Pick<
  Draft,
  "transitionEnd" | "start" | "end" | "transitionStart"
>

const TIME_FIELDS: ReadonlyArray<{
  field: TimeField
  label: string
  optional?: boolean
}> = [
  { field: "transitionEnd", label: "Fin transition (entrée)", optional: true },
  { field: "start", label: "Début" },
  { field: "end", label: "Fin", optional: true },
  { field: "transitionStart", label: "Début transition (sortie)", optional: true },
]

function toDraft(cue: {
  title: string
  artist?: string | null
  startMs: number
  endMs?: number | null
  transitionStartMs?: number | null
  transitionEndMs?: number | null
}): Draft {
  return {
    title: cue.title,
    artist: cue.artist ?? "",
    start: formatTimecode(cue.startMs),
    end: formatTimecode(cue.endMs),
    transitionStart: formatTimecode(cue.transitionStartMs),
    transitionEnd: formatTimecode(cue.transitionEndMs),
  }
}

function activeCueIndex(
  cues: { startMs: number; endMs?: number | null }[],
  timeMs: number,
): number {
  return cues.findIndex((cue, i) => {
    const next = cues[i + 1]
    const end = cue.endMs ?? next?.startMs ?? Number.POSITIVE_INFINITY
    return timeMs >= cue.startMs && timeMs < end
  })
}

export default function CueEditorPage() {
  const params = useParams<{ tapeId: string }>()
  const tapeId = params.tapeId as Id<"tapes">
  const tape = useQuery(api.tapes.get, { tapeId })
  const cues = useQuery(api.cues.listByTape, { tapeId })
  const playlist = useQuery(api.playlists.getByTape, { tapeId })

  const ensureForTape = useMutation(api.playlists.ensureForTape)
  const createCue = useMutation(api.cues.create)
  const updateCue = useMutation(api.cues.update)
  const removeCue = useMutation(api.cues.remove)
  const reorderCues = useMutation(api.cues.reorder)
  const replaceForTape = useMutation(api.cues.replaceForTape)
  const updatePlaylist = useMutation(api.playlists.update)

  const playerRef = useRef<LocalTapePlayerHandle>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [playheadMs, setPlayheadMs] = useState(0)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [initialFile, setInitialFile] = useState<File | null>(null)

  useEffect(() => {
    if (!tape) return
    void ensureForTape({ tapeId })
  }, [ensureForTape, tape, tapeId])

  useEffect(() => {
    if (!tape) return
    setInitialFile(getLocalFile(tape.localFileKey))
  }, [tape])

  useEffect(() => {
    if (!cues) return
    const next: Record<string, Draft> = {}
    for (const cue of cues) {
      next[cue._id] = toDraft(cue)
    }
    setDrafts(next)
  }, [cues])

  const ordered = useMemo(
    () => (cues ? [...cues].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [cues],
  )

  const cueStartsMs = useMemo(
    () => ordered.map((c) => c.startMs),
    [ordered],
  )

  const highlightedIndex =
    ordered.length > 0 ? activeCueIndex(ordered, playheadMs) : -1

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const seekToMs = (ms: number) => {
    playerRef.current?.seek(ms)
    setPlayheadMs(ms)
  }

  const useCurrentTime = (cueId: string, field: TimeField) => {
    const ms = playerRef.current?.getCurrentTimeMs() ?? playheadMs
    setDrafts((prev) => ({
      ...prev,
      [cueId]: {
        ...(prev[cueId] ?? toDraft(ordered.find((c) => c._id === cueId)!)),
        [field]: formatTimecode(ms),
      },
    }))
  }

  const goToTime = (value: string) => {
    const ms = parseTimecode(value)
    if (ms == null) return
    seekToMs(ms)
  }

  const saveCue = async (cueId: Id<"cues">, seg: (typeof ordered)[0]) => {
    const draft = drafts[cueId]
    if (!draft) return
    const startMs = parseTimecode(draft.start) ?? 0
    await updateCue({
      cueId,
      title: draft.title.trim() || seg.title,
      artist: draft.artist.trim() || null,
      startMs,
      endMs: parseTimecode(draft.end),
      transitionStartMs: parseTimecode(draft.transitionStart),
      transitionEndMs: parseTimecode(draft.transitionEnd),
    })
    setMessage("Enregistré")
  }

  const handleImportCues = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      void (async () => {
        try {
          const text = String(reader.result ?? "")
          const { cues: imported } = parseCueSheet(text)
          if (ordered.length > 0) {
            const ok = window.confirm(
              "Remplacer tous les cues existants de cette bande par la liste importée ?",
            )
            if (!ok) return
          }
          setBusy(true)
          try {
            const result = await replaceForTape({
              tapeId,
              cues: imported.map((cue) => ({
                title: cue.title,
                artist: cue.artist,
                startMs: cue.startMs,
              })),
            })
            setMessage(`${result.length} cues importés`)
          } finally {
            setBusy(false)
          }
        } catch (err) {
          console.error(err)
          setMessage("Impossible de lire ce fichier de cues.")
        }
      })()
    }
    reader.onerror = () => setMessage("Impossible de lire ce fichier de cues.")
    reader.readAsText(file)
  }

  if (tape === undefined || cues === undefined) {
    return <p className="text-neutral-500">Chargement…</p>
  }
  if (tape === null) {
    return <p className="text-neutral-500">Bande introuvable.</p>
  }

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-5xl flex-col">
      <header className="shrink-0 pb-4">
        <Link
          href="/tapes"
          className="text-sm font-semibold text-champagne-deep"
        >
          ← Bibliothèque
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{tape.title}</h1>
        <p className="mt-1 font-mono text-xs text-neutral-400">
          {tape.localFileKey}
        </p>
        <p className="mt-2 text-neutral-500">
          Écoutez la bande, repérez les transitions, puis utilisez les boutons
          tête de lecture sur chaque champ.
        </p>
      </header>

      <LocalTapePlayer
        ref={playerRef}
        localFileKey={tape.localFileKey}
        cueStartsMs={cueStartsMs}
        activeCueIndex={highlightedIndex}
        onTimeUpdate={setPlayheadMs}
        initialFile={initialFile}
        className="mb-4 shrink-0"
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-1">
          {ordered.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Aucun titre sur cette bande.
            </p>
          ) : (
            <ul className="space-y-4 pb-4">
              {ordered.map((seg, index) => {
                const draft = drafts[seg._id] ?? toDraft(seg)
                const active = index === highlightedIndex
                const expanded = expandedIds.has(seg._id)
                return (
                  <li
                    key={seg._id}
                    className={cn(
                      "rounded-[1.5rem] bg-white shadow-sm ring-2 transition-colors",
                      active ? "ring-champagne" : "ring-transparent",
                      expanded ? "p-5" : "px-5 py-3",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                        onClick={() => toggleExpanded(seg._id)}
                        aria-expanded={expanded}
                      >
                        {expanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </button>
                      <p className="min-w-0 flex-1 truncate font-semibold">
                        {draft.title || seg.title}
                      </p>
                    </div>
                    {expanded ? (
                      <>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <label className="block sm:col-span-2">
                            <span className="text-xs uppercase tracking-wider text-neutral-400">
                              Titre
                            </span>
                            <input
                              value={draft.title}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [seg._id]: { ...draft, title: e.target.value },
                                }))
                              }
                              className="mt-1 min-h-11 w-full rounded-2xl bg-neutral-50 px-4"
                            />
                          </label>
                          <label className="block sm:col-span-2">
                            <span className="text-xs uppercase tracking-wider text-neutral-400">
                              Artiste
                            </span>
                            <input
                              value={draft.artist}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [seg._id]: { ...draft, artist: e.target.value },
                                }))
                              }
                              className="mt-1 min-h-11 w-full rounded-2xl bg-neutral-50 px-4"
                            />
                          </label>
                          {TIME_FIELDS.map(({ field, label, optional }) => (
                            <TimecodeField
                              key={field}
                              label={label}
                              value={draft[field]}
                              placeholder={optional ? "optionnel" : "m:ss"}
                              onChange={(value) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [seg._id]: { ...draft, [field]: value },
                                }))
                              }
                              onUseCurrentTime={() =>
                                useCurrentTime(seg._id, field)
                              }
                              onGoTo={() => goToTime(draft[field])}
                            />
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            className="min-h-11 rounded-full bg-neutral-800 px-4 text-sm font-semibold text-white disabled:opacity-50"
                            onClick={() => {
                              void (async () => {
                                setBusy(true)
                                try {
                                  await saveCue(seg._id, seg)
                                } finally {
                                  setBusy(false)
                                }
                              })()
                            }}
                          >
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            className="flex size-11 items-center justify-center rounded-full bg-neutral-100"
                            disabled={index === 0}
                            onClick={() => {
                              void (async () => {
                                const ids = ordered.map((s) => s._id)
                                ;[ids[index - 1], ids[index]] = [
                                  ids[index],
                                  ids[index - 1],
                                ]
                                await reorderCues({ tapeId, cueIds: ids })
                              })()
                            }}
                          >
                            <ChevronUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="flex size-11 items-center justify-center rounded-full bg-neutral-100"
                            disabled={index >= ordered.length - 1}
                            onClick={() => {
                              void (async () => {
                                const ids = ordered.map((s) => s._id)
                                ;[ids[index], ids[index + 1]] = [
                                  ids[index + 1],
                                  ids[index],
                                ]
                                await reorderCues({ tapeId, cueIds: ids })
                              })()
                            }}
                          >
                            <ChevronDown className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600"
                            onClick={() => {
                              void removeCue({ cueId: seg._id })
                            }}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-neutral-200/80 bg-[#F4F4F5] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy}
                className="min-h-12 rounded-full bg-neutral-800 px-5 font-semibold text-white disabled:opacity-50"
                onClick={() => {
                  void (async () => {
                    setBusy(true)
                    try {
                      const created = await createCue({
                        tapeId,
                        title: "Nouveau titre",
                        startMs:
                          playerRef.current?.getCurrentTimeMs() ?? playheadMs,
                      })
                      setExpandedIds((prev) => new Set(prev).add(created))
                      setMessage("Enregistré")
                    } finally {
                      setBusy(false)
                    }
                  })()
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="size-4" />
                  Ajouter un titre
                </span>
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ""
                  handleImportCues(file)
                }}
              />
              <button
                type="button"
                disabled={busy}
                className="min-h-12 rounded-full bg-white px-5 font-semibold text-neutral-800 shadow-sm disabled:opacity-50"
                onClick={() => importInputRef.current?.click()}
              >
                <span className="inline-flex items-center gap-2">
                  <Upload className="size-4" />
                  Importer des cues…
                </span>
              </button>
            </div>
            {playlist ? (
              <button
                type="button"
                disabled={busy}
                className={cn(
                  "min-h-12 rounded-full px-5 font-semibold disabled:opacity-50",
                  playlist.ready
                    ? "bg-neutral-200 text-neutral-800"
                    : "bg-champagne-soft text-champagne-deep",
                )}
                onClick={() => {
                  void (async () => {
                    setBusy(true)
                    try {
                      await updatePlaylist({
                        playlistId: playlist._id,
                        ready: !playlist.ready,
                      })
                      setMessage(
                        playlist.ready
                          ? "Repasser en brouillon"
                          : "Marquer timecodée",
                      )
                    } finally {
                      setBusy(false)
                    }
                  })()
                }}
              >
                {playlist.ready ? "Repasser en brouillon" : "Marquer timecodée"}
              </button>
            ) : null}
          </div>
          {message ? (
            <p className="mt-2 text-sm text-neutral-500">{message}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
