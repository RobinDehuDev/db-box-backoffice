import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireManager } from "./lib/auth"

const categoryKey = v.union(
  v.literal("tempsForts"),
  v.literal("danceFloor"),
  v.literal("cocktail"),
  v.literal("karaoke"),
  v.literal("blindTest"),
  v.literal("burgerQuiz"),
)

export const listByCategory = query({
  args: { categoryKey },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const subs = await ctx.db
      .query("subcategories")
      .withIndex("by_category", (q) => q.eq("categoryKey", args.categoryKey))
      .collect()
    return await Promise.all(
      subs.map(async (sub) => {
        const items = await ctx.db
          .query("subcategoryItems")
          .withIndex("by_subcategory", (q) => q.eq("subcategoryId", sub._id))
          .collect()
        return { ...sub, itemCount: items.length, id: sub._id }
      }),
    )
  },
})

export const get = query({
  args: { subcategoryId: v.id("subcategories") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const sub = await ctx.db.get(args.subcategoryId)
    if (!sub) return null
    const items = await ctx.db
      .query("subcategoryItems")
      .withIndex("by_subcategory", (q) =>
        q.eq("subcategoryId", args.subcategoryId),
      )
      .collect()
    return { ...sub, itemCount: items.length, id: sub._id }
  },
})

export const create = mutation({
  args: {
    categoryKey,
    name: v.string(),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const existing = await ctx.db
      .query("subcategories")
      .withIndex("by_category", (q) => q.eq("categoryKey", args.categoryKey))
      .collect()
    const sortOrder =
      existing.reduce((max, s) => Math.max(max, s.sortOrder), -1) + 1
    const id = await ctx.db.insert("subcategories", {
      categoryKey: args.categoryKey,
      name: args.name.trim() || "Sans titre",
      tag: args.tag?.trim() ?? "",
      sortOrder,
    })
    return await ctx.db.get(id)
  },
})

export const update = mutation({
  args: {
    subcategoryId: v.id("subcategories"),
    name: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const sub = await ctx.db.get(args.subcategoryId)
    if (!sub) throw new Error("Sous-catégorie introuvable")
    const patch: { name?: string; tag?: string } = {}
    if (args.name !== undefined) patch.name = args.name.trim() || sub.name
    if (args.tag !== undefined) patch.tag = args.tag.trim()
    await ctx.db.patch(args.subcategoryId, patch)
    return await ctx.db.get(args.subcategoryId)
  },
})

export const remove = mutation({
  args: { subcategoryId: v.id("subcategories") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const items = await ctx.db
      .query("subcategoryItems")
      .withIndex("by_subcategory", (q) =>
        q.eq("subcategoryId", args.subcategoryId),
      )
      .collect()
    for (const item of items) {
      await ctx.db.delete(item._id)
    }
    await ctx.db.delete(args.subcategoryId)
  },
})

export const reorder = mutation({
  args: {
    categoryKey,
    subcategoryIds: v.array(v.id("subcategories")),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    for (let i = 0; i < args.subcategoryIds.length; i++) {
      const sub = await ctx.db.get(args.subcategoryIds[i])
      if (!sub || sub.categoryKey !== args.categoryKey) {
        throw new Error("Sous-catégorie invalide pour cette catégorie")
      }
      await ctx.db.patch(args.subcategoryIds[i], { sortOrder: i })
    }
    return await ctx.db
      .query("subcategories")
      .withIndex("by_category", (q) => q.eq("categoryKey", args.categoryKey))
      .collect()
  },
})

export const listItems = query({
  args: { subcategoryId: v.id("subcategories") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const items = await ctx.db
      .query("subcategoryItems")
      .withIndex("by_subcategory", (q) =>
        q.eq("subcategoryId", args.subcategoryId),
      )
      .collect()
    return await Promise.all(
      items.map(async (item) => {
        const playlist = await ctx.db.get(item.playlistId)
        return {
          ...item,
          id: item._id,
          title: playlist?.name ?? "Playlist introuvable",
          ready: playlist?.ready ?? null,
        }
      }),
    )
  },
})

export const addPlaylist = mutation({
  args: {
    subcategoryId: v.id("subcategories"),
    playlistId: v.id("playlists"),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const sub = await ctx.db.get(args.subcategoryId)
    if (!sub) throw new Error("Sous-catégorie introuvable")
    const playlist = await ctx.db.get(args.playlistId)
    if (!playlist) throw new Error("Playlist introuvable")
    const existing = await ctx.db
      .query("subcategoryItems")
      .withIndex("by_subcategory", (q) =>
        q.eq("subcategoryId", args.subcategoryId),
      )
      .collect()
    if (existing.some((i) => i.playlistId === args.playlistId)) {
      throw new Error("Playlist déjà dans la sous-catégorie")
    }
    const sortOrder =
      existing.reduce((max, i) => Math.max(max, i.sortOrder), -1) + 1
    await ctx.db.insert("subcategoryItems", {
      subcategoryId: args.subcategoryId,
      playlistId: args.playlistId,
      sortOrder,
    })
  },
})

export const removeItem = mutation({
  args: { itemId: v.id("subcategoryItems") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    await ctx.db.delete(args.itemId)
  },
})

export const reorderItems = mutation({
  args: {
    subcategoryId: v.id("subcategories"),
    itemIds: v.array(v.id("subcategoryItems")),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    for (let i = 0; i < args.itemIds.length; i++) {
      const item = await ctx.db.get(args.itemIds[i])
      if (!item || item.subcategoryId !== args.subcategoryId) {
        throw new Error("Élément invalide pour cette sous-catégorie")
      }
      await ctx.db.patch(args.itemIds[i], { sortOrder: i })
    }
  },
})
