import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireManager } from "./lib/auth"
import { ensurePlaylistForTape } from "./lib/playlists"
import { deleteTapeAndRelations, upsertTapeByKey } from "./lib/tapes"

const importItem = v.object({
  localFileKey: v.string(),
  title: v.string(),
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireManager(ctx)
    const tapes = await ctx.db.query("tapes").collect()
    const withCounts = await Promise.all(
      tapes.map(async (tape) => {
        const cues = await ctx.db
          .query("cues")
          .withIndex("by_tape", (q) => q.eq("tapeId", tape._id))
          .collect()
        return { ...tape, cueCount: cues.length }
      }),
    )
    return withCounts.sort((a, b) => a.title.localeCompare(b.title))
  },
})

export const get = query({
  args: { tapeId: v.id("tapes") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    return await ctx.db.get(args.tapeId)
  },
})

export const create = mutation({
  args: {
    localFileKey: v.string(),
    title: v.string(),
    durationMs: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const key = args.localFileKey.trim()
    if (!key) throw new Error("localFileKey requis")
    const existing = await ctx.db
      .query("tapes")
      .withIndex("by_localFileKey", (q) => q.eq("localFileKey", key))
      .unique()
    if (existing) throw new Error("Une bande avec ce localFileKey existe déjà")
    return await ctx.db.insert("tapes", {
      localFileKey: key,
      title: args.title.trim() || key,
      durationMs: args.durationMs ?? null,
    })
  },
})

export const update = mutation({
  args: {
    tapeId: v.id("tapes"),
    localFileKey: v.optional(v.string()),
    title: v.optional(v.string()),
    durationMs: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const tape = await ctx.db.get(args.tapeId)
    if (!tape) throw new Error("Bande introuvable")
    const patch: {
      localFileKey?: string
      title?: string
      durationMs?: number | null
    } = {}
    if (args.localFileKey !== undefined) {
      const key = args.localFileKey.trim()
      if (!key) throw new Error("localFileKey requis")
      const clash = await ctx.db
        .query("tapes")
        .withIndex("by_localFileKey", (q) => q.eq("localFileKey", key))
        .unique()
      if (clash && clash._id !== args.tapeId) {
        throw new Error("Une bande avec ce localFileKey existe déjà")
      }
      patch.localFileKey = key
    }
    if (args.title !== undefined) patch.title = args.title.trim()
    if (args.durationMs !== undefined) patch.durationMs = args.durationMs
    await ctx.db.patch(args.tapeId, patch)
    return await ctx.db.get(args.tapeId)
  },
})

export const remove = mutation({
  args: { tapeId: v.id("tapes") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    await deleteTapeAndRelations(ctx, args.tapeId)
  },
})

export const importMany = mutation({
  args: { items: v.array(importItem) },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    let imported = 0
    for (const item of args.items) {
      const { created } = await upsertTapeByKey(
        ctx,
        item.localFileKey,
        item.title,
      )
      if (created) imported++
    }
    return { imported, total: args.items.length }
  },
})

export const syncScan = mutation({
  args: {
    keys: v.array(v.string()),
    titles: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const keySet = new Set(args.keys.map((k) => k.trim()).filter(Boolean))
    let added = 0
    let updated = 0

    for (const key of keySet) {
      const title = args.titles?.[key] ?? key
      const result = await upsertTapeByKey(ctx, key, title)
      if (result.created) added++
      else if (result.updated) updated++
    }

    const allTapes = await ctx.db.query("tapes").collect()
    let removed = 0
    for (const tape of allTapes) {
      if (!keySet.has(tape.localFileKey)) {
        await deleteTapeAndRelations(ctx, tape._id)
        removed++
      }
    }

    return {
      added,
      updated,
      removed,
      total: keySet.size,
    }
  },
})
