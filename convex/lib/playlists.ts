import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"

export async function ensurePlaylistForTape(
  ctx: MutationCtx,
  tapeId: Id<"tapes">,
  name: string,
): Promise<Id<"playlists">> {
  const all = await ctx.db.query("playlists").collect()
  const existing = all.find((p) => p.tapeId === tapeId)
  if (existing) return existing._id

  const sortOrder =
    all.reduce((max, p) => Math.max(max, p.sortOrder), -1) + 1
  return await ctx.db.insert("playlists", {
    name: name.trim() || "Sans titre",
    description: "",
    tapeId,
    ready: false,
    sortOrder,
  })
}
