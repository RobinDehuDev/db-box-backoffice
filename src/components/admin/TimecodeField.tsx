"use client"

import { LocateFixed, Timer } from "lucide-react"
import { parseTimecode } from "@/lib/timecode"

type TimecodeFieldProps = {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
  onGoTo?: () => void
  onUseCurrentTime?: () => void
}

export function TimecodeField({
  label,
  value,
  placeholder = "m:ss",
  onChange,
  onGoTo,
  onUseCurrentTime,
}: TimecodeFieldProps) {
  const canGoTo = onGoTo != null && parseTimecode(value) != null

  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-neutral-400">
        {label}
      </span>
      <div className="mt-1 flex gap-2">
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-2xl bg-neutral-50 px-4 font-mono"
        />
        {onGoTo ? (
          <button
            type="button"
            title="Aller au timecode"
            aria-label="Aller au timecode"
            disabled={!canGoTo}
            onClick={onGoTo}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 disabled:opacity-40"
          >
            <LocateFixed className="size-4" />
          </button>
        ) : null}
        {onUseCurrentTime ? (
          <button
            type="button"
            title="Utiliser la tête de lecture"
            aria-label="Utiliser la tête de lecture"
            onClick={onUseCurrentTime}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700"
          >
            <Timer className="size-4" />
          </button>
        ) : null}
      </div>
    </label>
  )
}
