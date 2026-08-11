import { parseMinutesSeconds } from "./timecode"

export type CueSheetCue = {
  artist: string | null
  title: string
  startMs: number
}

export type CueSheetParseResult = {
  mixName: string | null
  cues: CueSheetCue[]
}

export class CueSheetParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CueSheetParseError"
  }
}

const TRAILING_TIME = /(\d+)\s*[''′’:]\s*(\d{2})\s*$/u

export function parseCueSheet(text: string): CueSheetParseResult {
  const lines = text.split(/\r?\n/)
  let mixName: string | null = null
  const cues: CueSheetCue[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    const timeMatch = line.match(TRAILING_TIME)
    if (!timeMatch) {
      if (cues.length === 0 && mixName == null) {
        mixName = line
      }
      continue
    }

    const minutes = Number(timeMatch[1])
    const seconds = Number(timeMatch[2])
    const startMs = parseMinutesSeconds(minutes, seconds)
    if (startMs == null) {
      throw new CueSheetParseError(`Timecode invalide : ${line}`)
    }

    const beforeTime = line.slice(0, timeMatch.index).trim()
    if (!beforeTime) {
      throw new CueSheetParseError(`Titre manquant : ${line}`)
    }

    const normalized = beforeTime.replace(/\s+-\s*$/u, " - ")
    const dashIndex = normalized.indexOf(" - ")
    let artist: string | null
    let title: string

    if (dashIndex === -1) {
      artist = null
      title = normalized
    } else {
      artist = normalized.slice(0, dashIndex).trim() || null
      title = normalized.slice(dashIndex + 3).trim()
      if (!title) {
        title = artist ?? normalized
      }
    }

    if (!title) {
      throw new CueSheetParseError(`Titre manquant : ${line}`)
    }

    cues.push({ artist, title, startMs })
  }

  if (cues.length === 0) {
    throw new CueSheetParseError("Aucun cue trouvé dans le fichier")
  }

  return { mixName, cues }
}
