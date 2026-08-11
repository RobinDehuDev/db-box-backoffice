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
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  LocalTapePlayer,
  type LocalTapePlayerHandle,
} from "@/components/admin/LocalTapePlayer"
import { TimecodeField } from "@/components/admin/TimecodeField"
import { formatTimecode, parseTimecode } from "@/lib/timecode"
import { cn } from "@/lib/utils"

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
  const createCue = useMutation(api.cues.create)
  const updateCue = useMutation(api.cues.update)
  const removeCue = useMutation(api.cues.remove)
  const reorderCues = useMutation(api.cues.reorder)

  const playerRef = useRef<LocalTapePlayerHandle>(null)
  const [playheadMs, setPlayheadMs] = useState(0)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

  const saveCue = async (cueId: Id<"cues">) => {
    const draft = drafts[cueId]
    if (!draft) return
    const startMs = parseTimecode(draft.start)
    if (startMs == null) {
      setMessage("Timecode de début invalide")
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      await updateCue({
        cueId,
        title: draft.title,
        artist: draft.artist || null,
        startMs,
        endMs: parseTimecode(draft.end),
        transitionStartMs: parseTimecode(draft.transitionStart),
        transitionEndMs: parseTimecode(draft.transitionEnd),
      })
      setMessage("Enregistré")
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Échec de l’enregistrement")
    } finally {
      setBusy(false)
    }
  }

  const move = async (index: number, dir: -1 | 1) => {
    const nextIndex = index + dir
    if (nextIndex < 0 || nextIndex >= ordered.length) return
    const ids = ordered.map((c) => c._id)
    const tmp = ids[index]
    ids[index] = ids[nextIndex]
    ids[nextIndex] = tmp
    await reorderCues({ tapeId, cueIds: ids })
  }

  if (tape === undefined || cues === undefined) {
    return <p className="text-neutral-500">Chargement…</p>
  }
  if (tape === null) {
    return <p className="text-neutral-500">Bande introuvable.</p>
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <Link
          href="/tapes"
          className="text-sm font-semibold text-champagne-deep"
        >
          ← Bandes
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{tape.title}</h1>
        <p className="mt-1 font-mono text-xs text-neutral-400">
          {tape.localFileKey}
        </p>
        <p className="mt-2 text-neutral-500">
          Chargez le fichier audio local correspondant pour écouter et timecoder.
          Seules les cues sont enregistrées sur Convex.
        </p>
      </header>

      <LocalTapePlayer
        ref={playerRef}
        localFileKey={tape.localFileKey}
        cueStartsMs={cueStartsMs}
        activeCueIndex={highlightedIndex}
        onTimeUpdate={setPlayheadMs}
      />

      {message ? <p className="text-sm text-neutral-600">{message}</p> : null}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void createCue({
              tapeId,
              title: `Titre ${(cues?.length ?? 0) + 1}`,
              startMs: playerRef.current?.getCurrentTimeMs() ?? playheadMs,
            })
          }
          className="flex min-h-12 items-center gap-2 rounded-full bg-neutral-800 px-5 font-semibold text-white disabled:opacity-50"
        >
          <Plus className="size-4" />
          Ajouter un cue
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {ordered.map((cue, index) => {
          const draft = drafts[cue._id] ?? toDraft(cue)
          const expanded = expandedIds.has(cue._id)
          const active = index === highlightedIndex
          return (
            <li
              key={cue._id}
              className={cn(
                "rounded-[1.5rem] bg-white p-4 shadow-sm ring-2 transition-colors",
                active ? "ring-champagne" : "ring-transparent",
              )}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleExpanded(cue._id)}
                  className="flex size-10 items-center justify-center rounded-full bg-neutral-50"
                >
                  {expanded ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{draft.title}</p>
                  <p className="font-mono text-xs text-neutral-400">
                    {draft.start}
                    {draft.end ? ` → ${draft.end}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => void move(index, -1)}
                  className="flex size-10 items-center justify-center rounded-full bg-neutral-50 disabled:opacity-40"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={index === ordered.length - 1}
                  onClick={() => void move(index, 1)}
                  className="flex size-10 items-center justify-center rounded-full bg-neutral-50 disabled:opacity-40"
                >
                  <ChevronDown className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm("Supprimer ce cue ?")) return
                    void removeCue({ cueId: cue._id })
                  }}
                  className="flex size-10 items-center justify-center rounded-full bg-neutral-50 text-neutral-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {expanded ? (
                <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
                  <label className="block">
                    <span className="text-xs uppercase tracking-wider text-neutral-400">
                      Titre
                    </span>
                    <input
                      value={draft.title}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [cue._id]: { ...draft, title: e.target.value },
                        }))
                      }
                      className="mt-1 min-h-11 w-full rounded-2xl bg-neutral-50 px-4"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-wider text-neutral-400">
                      Artiste
                    </span>
                    <input
                      value={draft.artist}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [cue._id]: { ...draft, artist: e.target.value },
                        }))
                      }
                      className="mt-1 min-h-11 w-full rounded-2xl bg-neutral-50 px-4"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {TIME_FIELDS.map(({ field, label, optional }) => (
                      <TimecodeField
                        key={field}
                        label={label}
                        value={draft[field]}
                        placeholder={optional ? "optionnel" : "m:ss"}
                        onChange={(value) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [cue._id]: { ...draft, [field]: value },
                          }))
                        }
                        onGoTo={() => {
                          const ms = parseTimecode(draft[field])
                          if (ms != null) seekToMs(ms)
                        }}
                        onUseCurrentTime={() =>
                          useCurrentTime(cue._id, field)
                        }
                      />
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={cue.blacklisted}
                      onChange={(e) =>
                        void updateCue({
                          cueId: cue._id,
                          blacklisted: e.target.checked,
                        })
                      }
                    />
                    Blacklisté
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveCue(cue._id)}
                    className={cn(
                      "min-h-11 rounded-full bg-neutral-800 px-5 text-sm font-semibold text-white disabled:opacity-50",
                    )}
                  >
                    Enregistrer le cue
                  </button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
