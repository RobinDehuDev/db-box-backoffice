"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Upload,
  Volume2,
} from "lucide-react"
import { formatTime } from "@/lib/format-time"
import { cn } from "@/lib/utils"

export type LocalTapePlayerHandle = {
  seek: (ms: number) => void
  getCurrentTimeMs: () => number
}

type LocalTapePlayerProps = {
  localFileKey: string
  cueStartsMs: number[]
  activeCueIndex: number
  onTimeUpdate?: (ms: number) => void
  onActiveCueChange?: (index: number) => void
  className?: string
}

function basename(key: string): string {
  const parts = key.replace(/\\/g, "/").split("/")
  return parts[parts.length - 1] ?? key
}

function keysMatch(localFileKey: string, fileName: string): boolean {
  const expected = basename(localFileKey).toLowerCase()
  const actual = fileName.toLowerCase()
  return expected === actual || localFileKey.toLowerCase() === actual
}

export const LocalTapePlayer = forwardRef<
  LocalTapePlayerHandle,
  LocalTapePlayerProps
>(function LocalTapePlayer(
  {
    localFileKey,
    cueStartsMs,
    activeCueIndex,
    onTimeUpdate,
    onActiveCueChange,
    className,
  },
  ref,
) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState<string | null>(null)
  const [keyMismatch, setKeyMismatch] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)

  useImperativeHandle(ref, () => ({
    seek(ms: number) {
      const audio = audioRef.current
      if (!audio) return
      audio.currentTime = ms / 1000
      setCurrentTime(ms / 1000)
    },
    getCurrentTimeMs() {
      return Math.round((audioRef.current?.currentTime ?? currentTime) * 1000)
    },
  }))

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  const loadFile = (file: File) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setFileName(file.name)
    setKeyMismatch(!keysMatch(localFileKey, file.name))
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)

    const audio = audioRef.current
    if (!audio) return
    audio.src = url
    audio.load()
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !objectUrlRef.current) return
    if (audio.paused) {
      void audio.play()
    } else {
      audio.pause()
    }
  }

  const seekTo = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = seconds
    setCurrentTime(seconds)
  }

  const goToCue = (index: number) => {
    const ms = cueStartsMs[index]
    if (ms == null) return
    seekTo(ms / 1000)
    onActiveCueChange?.(index)
  }

  const prevCue = () => {
    if (cueStartsMs.length === 0) return
    const idx =
      activeCueIndex <= 0 ? 0 : activeCueIndex > 0 ? activeCueIndex - 1 : 0
    if (currentTime > 3 && activeCueIndex >= 0) {
      goToCue(activeCueIndex)
      return
    }
    goToCue(idx)
  }

  const nextCue = () => {
    if (cueStartsMs.length === 0) return
    const idx =
      activeCueIndex < 0
        ? 0
        : Math.min(activeCueIndex + 1, cueStartsMs.length - 1)
    goToCue(idx)
  }

  return (
    <section
      className={cn(
        "rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-neutral-100",
        className,
      )}
    >
      <audio
        ref={audioRef}
        className="hidden"
        onTimeUpdate={() => {
          const audio = audioRef.current
          if (!audio) return
          setCurrentTime(audio.currentTime)
          onTimeUpdate?.(Math.round(audio.currentTime * 1000))
        }}
        onLoadedMetadata={() => {
          const audio = audioRef.current
          if (!audio) return
          setDuration(audio.duration || 0)
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-800">
            Aperçu audio local
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-neutral-400">
            {fileName ?? "Aucun fichier chargé"}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file) loadFile(file)
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-11 items-center gap-2 rounded-full bg-champagne-soft px-4 text-sm font-semibold text-champagne-deep"
        >
          <Upload className="size-4" />
          Choisir le fichier local…
        </button>
      </div>

      {keyMismatch && fileName ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Le nom du fichier ne correspond pas à{" "}
          <span className="font-mono">{localFileKey}</span>.
        </p>
      ) : null}

      <div className="mt-4">
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 1}
          step={0.1}
          value={Math.min(currentTime, duration > 0 ? duration : 0)}
          disabled={!fileName || duration <= 0}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="h-2 w-full appearance-none rounded-full bg-neutral-200 accent-champagne disabled:opacity-50"
          aria-label="Position"
        />
        <div className="mt-1 flex justify-between font-mono text-xs text-neutral-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!fileName || cueStartsMs.length === 0}
          onClick={prevCue}
          className="flex size-11 items-center justify-center rounded-full bg-neutral-100 disabled:opacity-40"
          aria-label="Cue précédent"
        >
          <SkipBack className="size-4" />
        </button>
        <button
          type="button"
          disabled={!fileName}
          onClick={togglePlay}
          className="flex size-12 items-center justify-center rounded-full bg-neutral-800 text-white disabled:opacity-40"
          aria-label={playing ? "Pause" : "Lecture"}
        >
          {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>
        <button
          type="button"
          disabled={!fileName || cueStartsMs.length === 0}
          onClick={nextCue}
          className="flex size-11 items-center justify-center rounded-full bg-neutral-100 disabled:opacity-40"
          aria-label="Cue suivant"
        >
          <SkipForward className="size-4" />
        </button>

        <div className="ml-auto flex min-w-[140px] items-center gap-2">
          <Volume2 className="size-4 shrink-0 text-neutral-400" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            disabled={!fileName}
            onChange={(e) => {
              const v = Number(e.target.value)
              setVolume(v)
              if (audioRef.current) audioRef.current.volume = v
            }}
            className="h-2 w-full appearance-none rounded-full bg-neutral-200 accent-champagne disabled:opacity-50"
            aria-label="Volume"
          />
        </div>
      </div>
    </section>
  )
})
