import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireManager } from "./lib/auth"

export const listByTape = query({
  args: { tapeId: v.id("tapes") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    return await ctx.db
      .query("cues")
      .withIndex("by_tape", (q) => q.eq("tapeId", args.tapeId))
      .collect()
  },
})

export const create = mutation({
  args: {
    tapeId: v.id("tapes"),
    title: v.string(),
    artist: v.optional(v.union(v.string(), v.null())),
    startMs: v.number(),
    endMs: v.optional(v.union(v.number(), v.null())),
    transitionStartMs: v.optional(v.union(v.number(), v.null())),
    transitionEndMs: v.optional(v.union(v.number(), v.null())),
    blacklisted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const tape = await ctx.db.get(args.tapeId)
    if (!tape) throw new Error("Bande introuvable")
    const existing = await ctx.db
      .query("cues")
      .withIndex("by_tape", (q) => q.eq("tapeId", args.tapeId))
      .collect()
    const sortOrder =
      existing.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1
    return await ctx.db.insert("cues", {
      tapeId: args.tapeId,
      title: args.title.trim() || "Cue",
      artist: args.artist ?? null,
      startMs: args.startMs,
      endMs: args.endMs ?? null,
      transitionStartMs: args.transitionStartMs ?? null,
      transitionEndMs: args.transitionEndMs ?? null,
      blacklisted: args.blacklisted ?? false,
      sortOrder,
    })
  },
})

export const update = mutation({
  args: {
    cueId: v.id("cues"),
    title: v.optional(v.string()),
    artist: v.optional(v.union(v.string(), v.null())),
    startMs: v.optional(v.number()),
    endMs: v.optional(v.union(v.number(), v.null())),
    transitionStartMs: v.optional(v.union(v.number(), v.null())),
    transitionEndMs: v.optional(v.union(v.number(), v.null())),
    blacklisted: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const cue = await ctx.db.get(args.cueId)
    if (!cue) throw new Error("Cue introuvable")
    const { cueId, ...rest } = args
    const patch: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) patch[key] = value
    }
    if (typeof patch.title === "string") {
      patch.title = patch.title.trim() || cue.title
    }
    await ctx.db.patch(cueId, patch)
    return await ctx.db.get(cueId)
  },
})

export const remove = mutation({
  args: { cueId: v.id("cues") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    await ctx.db.delete(args.cueId)
  },
})

export const reorder = mutation({
  args: {
    tapeId: v.id("tapes"),
    cueIds: v.array(v.id("cues")),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    for (let i = 0; i < args.cueIds.length; i++) {
      const cue = await ctx.db.get(args.cueIds[i])
      if (!cue || cue.tapeId !== args.tapeId) {
        throw new Error("Cue invalide pour cette bande")
      }
      await ctx.db.patch(args.cueIds[i], { sortOrder: i })
    }
    return await ctx.db
      .query("cues")
      .withIndex("by_tape", (q) => q.eq("tapeId", args.tapeId))
      .collect()
  },
})

const importedCue = v.object({
  title: v.string(),
  artist: v.optional(v.union(v.string(), v.null())),
  startMs: v.number(),
})

export const replaceForTape = mutation({
  args: {
    tapeId: v.id("tapes"),
    cues: v.array(importedCue),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const tape = await ctx.db.get(args.tapeId)
    if (!tape) throw new Error("Bande introuvable")
    if (args.cues.length === 0) {
      throw new Error("Au moins un cue est requis")
    }

    const existing = await ctx.db
      .query("cues")
      .withIndex("by_tape", (q) => q.eq("tapeId", args.tapeId))
      .collect()
    for (const cue of existing) {
      await ctx.db.delete(cue._id)
    }

    for (let i = 0; i < args.cues.length; i++) {
      const cue = args.cues[i]
      const title = cue.title?.trim()
      if (!title) throw new Error(`Cue ${i + 1} sans titre`)
      if (!Number.isFinite(cue.startMs) || cue.startMs < 0) {
        throw new Error(`Cue ${i + 1} : timecode invalide`)
      }
      await ctx.db.insert("cues", {
        tapeId: args.tapeId,
        title,
        artist: cue.artist?.trim() || null,
        startMs: Math.round(cue.startMs),
        endMs: null,
        transitionStartMs: null,
        transitionEndMs: null,
        blacklisted: false,
        sortOrder: i,
      })
    }

    return await ctx.db
      .query("cues")
      .withIndex("by_tape", (q) => q.eq("tapeId", args.tapeId))
      .collect()
  },
})
