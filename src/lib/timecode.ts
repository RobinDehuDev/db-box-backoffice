/** Convert minutes + seconds into milliseconds; null if invalid. */
export function parseMinutesSeconds(
  minutes: number,
  seconds: number,
): number | null {
  if (
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    minutes < 0 ||
    seconds < 0 ||
    seconds >= 60
  ) {
    return null
  }
  return Math.round((minutes * 60 + seconds) * 1000)
}

/** Parse mm:ss or hh:mm:ss or plain seconds into milliseconds */
export function parseTimecode(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000
  const parts = trimmed.split(":").map((p) => Number(p))
  if (parts.some((n) => Number.isNaN(n))) return null
  if (parts.length === 2) {
    const [m, s] = parts
    return parseMinutesSeconds(m, s)
  }
  if (parts.length === 3) {
    const [h, m, s] = parts
    if (!Number.isFinite(h) || h < 0) return null
    const rest = parseMinutesSeconds(m, s)
    if (rest == null) return null
    return Math.round(h * 3600 * 1000 + rest)
  }
  return null
}

export function formatTimecode(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return ""
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }
  return `${m}:${s.toString().padStart(2, "0")}`
}
