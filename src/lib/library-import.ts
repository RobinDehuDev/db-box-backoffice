const AUDIO_EXT = new Set([
  ".mp3",
  ".wav",
  ".flac",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
])

export type LibraryImportItem = {
  localFileKey: string
  title: string
}

export function titleFromKey(key: string): string {
  const base = key.replace(/\\/g, "/").split("/").pop() ?? key
  const dot = base.lastIndexOf(".")
  return dot > 0 ? base.slice(0, dot) : base
}

function isAudioFile(name: string): boolean {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase()
  return AUDIO_EXT.has(ext)
}

export function itemsFromFileList(files: FileList): LibraryImportItem[] {
  const items: LibraryImportItem[] = []
  for (const file of Array.from(files)) {
    if (!isAudioFile(file.name)) continue
    const relative =
      "webkitRelativePath" in file &&
      typeof file.webkitRelativePath === "string" &&
      file.webkitRelativePath
        ? file.webkitRelativePath
        : file.name
    items.push({
      localFileKey: relative,
      title: titleFromKey(relative),
    })
  }
  return items
}

export function folderNameFromFileList(files: FileList): string | null {
  for (const file of Array.from(files)) {
    const rel = file.webkitRelativePath
    if (rel) {
      const parts = rel.split("/")
      if (parts.length > 1) return parts[0]
    }
  }
  return null
}

export const LIBRARY_ROOT_KEY = "backoffice.libraryRoot"
