export function setLocalFile(localFileKey: string, file: File): void {
  if (typeof window === "undefined") return
  const key = localFileKey.trim()
  if (!key) return

  const w = window as unknown as {
    __cozyLocalFileCache?: Map<string, File>
  }

  if (!w.__cozyLocalFileCache) {
    w.__cozyLocalFileCache = new Map()
  }

  w.__cozyLocalFileCache.set(key, file)
}

export function getLocalFile(localFileKey: string): File | null {
  if (typeof window === "undefined") return null
  const key = localFileKey.trim()
  if (!key) return null

  const w = window as unknown as {
    __cozyLocalFileCache?: Map<string, File>
  }

  return w.__cozyLocalFileCache?.get(key) ?? null
}

