import { query } from "./_generated/server"
import { requireManager } from "./lib/auth"

export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireManager(ctx)
    const tapes = await ctx.db.query("tapes").collect()
    const cues = await ctx.db.query("cues").collect()
    const playlists = await ctx.db.query("playlists").collect()
    const subcategories = await ctx.db.query("subcategories").collect()
    return {
      tapes: tapes.length,
      cues: cues.length,
      cuesBlacklisted: cues.filter((c) => c.blacklisted).length,
      tapesWithoutCues: tapes.filter(
        (t) => !cues.some((c) => c.tapeId === t._id),
      ).length,
      playlists: playlists.length,
      playlistsReady: playlists.filter((p) => p.ready).length,
      subcategories: subcategories.length,
    }
  },
})
