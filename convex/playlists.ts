import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireManager } from "./lib/auth"
import { ensurePlaylistForTape } from "./lib/playlists"

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireManager(ctx)
    const playlists = await ctx.db.query("playlists").collect()
    const enriched = await Promise.all(
      playlists.map(async (pl) => {
        const tape = pl.tapeId ? await ctx.db.get(pl.tapeId) : null
        const cueCount = pl.tapeId
          ? (
              await ctx.db
                .query("cues")
                .withIndex("by_tape", (q) => q.eq("tapeId", pl.tapeId!))
                .collect()
            ).length
          : 0
        return {
          ...pl,
          tapeTitle: tape?.title ?? null,
          localFileKey: tape?.localFileKey ?? null,
          cueCount,
        }
      }),
    )
    return enriched.sort((a, b) => a.sortOrder - b.sortOrder)
  },
})

export const get = query({
  args: { playlistId: v.id("playlists") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const pl = await ctx.db.get(args.playlistId)
    if (!pl) return null
    const tape = pl.tapeId ? await ctx.db.get(pl.tapeId) : null
    return { ...pl, tape }
  },
})

export const getByTape = query({
  args: { tapeId: v.id("tapes") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const all = await ctx.db.query("playlists").collect()
    const pl = all.find((p) => p.tapeId === args.tapeId) ?? null
    if (!pl) return null
    const tape = await ctx.db.get(args.tapeId)
    const cueCount = (
      await ctx.db
        .query("cues")
        .withIndex("by_tape", (q) => q.eq("tapeId", args.tapeId))
        .collect()
    ).length
    return {
      ...pl,
      tapeTitle: tape?.title ?? null,
      localFileKey: tape?.localFileKey ?? null,
      cueCount,
    }
  },
})

export const ensureForTape = mutation({
  args: { tapeId: v.id("tapes") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const tape = await ctx.db.get(args.tapeId)
    if (!tape) throw new Error("Bande introuvable")
    const playlistId = await ensurePlaylistForTape(ctx, args.tapeId, tape.title)
    return await ctx.db.get(playlistId)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    tapeId: v.optional(v.union(v.id("tapes"), v.null())),
    ready: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const all = await ctx.db.query("playlists").collect()
    const sortOrder =
      all.reduce((max, p) => Math.max(max, p.sortOrder), -1) + 1
    return await ctx.db.insert("playlists", {
      name: args.name.trim() || "Sans titre",
      description: args.description?.trim() ?? "",
      tapeId: args.tapeId ?? null,
      ready: args.ready ?? false,
      sortOrder,
    })
  },
})

export const update = mutation({
  args: {
    playlistId: v.id("playlists"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    tapeId: v.optional(v.union(v.id("tapes"), v.null())),
    ready: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const pl = await ctx.db.get(args.playlistId)
    if (!pl) throw new Error("Playlist introuvable")
    const { playlistId, ...rest } = args
    const patch: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) patch[key] = value
    }
    if (typeof patch.name === "string") {
      patch.name = patch.name.trim() || pl.name
    }
    await ctx.db.patch(playlistId, patch)
    return await ctx.db.get(playlistId)
  },
})

export const remove = mutation({
  args: { playlistId: v.id("playlists") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const items = await ctx.db
      .query("subcategoryItems")
      .withIndex("by_playlist", (q) => q.eq("playlistId", args.playlistId))
      .collect()
    for (const item of items) {
      await ctx.db.delete(item._id)
    }
    await ctx.db.delete(args.playlistId)
  },
})
