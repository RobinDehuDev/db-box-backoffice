import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import { ensurePlaylistForTape } from "./playlists"

export async function upsertTapeByKey(
  ctx: MutationCtx,
  localFileKey: string,
  title: string,
): Promise<{ tapeId: Id<"tapes">; created: boolean; updated: boolean }> {
  const key = localFileKey.trim()
  if (!key) throw new Error("localFileKey requis")

  const existing = await ctx.db
    .query("tapes")
    .withIndex("by_localFileKey", (q) => q.eq("localFileKey", key))
    .unique()

  if (existing) {
    const nextTitle = title.trim() || existing.title
    let updated = false
    if (nextTitle !== existing.title) {
      await ctx.db.patch(existing._id, { title: nextTitle })
      updated = true
    }
    await ensurePlaylistForTape(ctx, existing._id, nextTitle)
    return { tapeId: existing._id, created: false, updated }
  }

  const tapeId = await ctx.db.insert("tapes", {
    localFileKey: key,
    title: title.trim() || key,
    durationMs: null,
  })
  await ensurePlaylistForTape(ctx, tapeId, title.trim() || key)
  return { tapeId, created: true, updated: false }
}

export async function deleteTapeAndRelations(
  ctx: MutationCtx,
  tapeId: Id<"tapes">,
): Promise<void> {
  const cues = await ctx.db
    .query("cues")
    .withIndex("by_tape", (q) => q.eq("tapeId", tapeId))
    .collect()
  for (const cue of cues) {
    await ctx.db.delete(cue._id)
  }

  const playlists = await ctx.db.query("playlists").collect()
  for (const pl of playlists) {
    if (pl.tapeId === tapeId) {
      await ctx.db.patch(pl._id, { tapeId: null })
    }
  }

  await ctx.db.delete(tapeId)
}
