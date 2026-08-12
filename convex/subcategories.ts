import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import { requireManager } from "./lib/auth"
import { categoryKey } from "./lib/categories"
import { ensurePlaylistForTape } from "./lib/playlists"
import { deleteStorageId, storageUrl } from "./lib/storage"

async function enrichSubcategory(ctx: QueryCtx, sub: Doc<"subcategories">) {
  const items = await ctx.db
    .query("subcategoryItems")
    .withIndex("by_subcategory", (q) => q.eq("subcategoryId", sub._id))
    .collect()
  const tab = sub.tabId ? await ctx.db.get(sub.tabId) : null
  const iconUrl = await storageUrl(ctx, sub.iconStorageId)
  return {
    ...sub,
    itemCount: items.length,
    id: sub._id,
    tabName: tab?.name ?? "",
    iconUrl,
  }
}

export const listByCategory = query({
  args: { categoryKey },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const subs = await ctx.db
      .query("subcategories")
      .withIndex("by_category", (q) => q.eq("categoryKey", args.categoryKey))
      .collect()
    const enriched = await Promise.all(
      subs.map((sub) => enrichSubcategory(ctx, sub)),
    )
    return enriched.sort((a, b) => {
      const tabA = a.tabId ?? ""
      const tabB = b.tabId ?? ""
      if (tabA !== tabB) return String(tabA).localeCompare(String(tabB))
      return a.sortOrder - b.sortOrder
    })
  },
})

export const get = query({
  args: { subcategoryId: v.id("subcategories") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const sub = await ctx.db.get(args.subcategoryId)
    if (!sub) return null
    return await enrichSubcategory(ctx, sub)
  },
})

export const create = mutation({
  args: {
    categoryKey,
    tabId: v.id("categoryTabs"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const tab = await ctx.db.get(args.tabId)
    if (!tab || tab.categoryKey !== args.categoryKey) {
      throw new Error("Onglet invalide pour cette catégorie")
    }
    const existing = await ctx.db
      .query("subcategories")
      .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
      .collect()
    const sortOrder =
      existing.reduce((max, s) => Math.max(max, s.sortOrder), -1) + 1
    const id = await ctx.db.insert("subcategories", {
      categoryKey: args.categoryKey,
      tabId: args.tabId,
      name: args.name.trim() || "Sans titre",
      sortOrder,
    })
    const created = await ctx.db.get(id)
    if (!created) throw new Error("Échec de création")
    return await enrichSubcategory(ctx, created)
  },
})

export const update = mutation({
  args: {
    subcategoryId: v.id("subcategories"),
    name: v.optional(v.string()),
    tabId: v.optional(v.id("categoryTabs")),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const sub = await ctx.db.get(args.subcategoryId)
    if (!sub) throw new Error("Sous-catégorie introuvable")

    const patch: {
      name?: string
      tabId?: Id<"categoryTabs">
      sortOrder?: number
    } = {}

    if (args.name !== undefined) patch.name = args.name.trim() || sub.name

    if (args.tabId !== undefined && args.tabId !== sub.tabId) {
      const tab = await ctx.db.get(args.tabId)
      if (!tab || tab.categoryKey !== sub.categoryKey) {
        throw new Error("Onglet invalide pour cette catégorie")
      }
      const inTab = await ctx.db
        .query("subcategories")
        .withIndex("by_tab", (q) => q.eq("tabId", args.tabId!))
        .collect()
      patch.tabId = args.tabId
      patch.sortOrder =
        inTab.reduce((max, s) => Math.max(max, s.sortOrder), -1) + 1
    }

    await ctx.db.patch(args.subcategoryId, patch)
    const updated = await ctx.db.get(args.subcategoryId)
    if (!updated) throw new Error("Sous-catégorie introuvable")
    return await enrichSubcategory(ctx, updated)
  },
})

export const remove = mutation({
  args: { subcategoryId: v.id("subcategories") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const sub = await ctx.db.get(args.subcategoryId)
    if (!sub) return

    await deleteStorageId(ctx, sub.iconStorageId)

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

export const reorderWithinTab = mutation({
  args: {
    tabId: v.id("categoryTabs"),
    subcategoryIds: v.array(v.id("subcategories")),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    for (let i = 0; i < args.subcategoryIds.length; i++) {
      const sub = await ctx.db.get(args.subcategoryIds[i])
      if (!sub || sub.tabId !== args.tabId) {
        throw new Error("Sous-catégorie invalide pour cet onglet")
      }
      await ctx.db.patch(args.subcategoryIds[i], { sortOrder: i })
    }
  },
})

export const generateIconUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireManager(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const setIcon = mutation({
  args: {
    subcategoryId: v.id("subcategories"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const sub = await ctx.db.get(args.subcategoryId)
    if (!sub) throw new Error("Sous-catégorie introuvable")

    const meta = await ctx.storage.getMetadata(args.storageId)
    if (!meta) throw new Error("Fichier introuvable")

    await deleteStorageId(ctx, sub.iconStorageId)
    await ctx.db.patch(args.subcategoryId, { iconStorageId: args.storageId })

    const updated = await ctx.db.get(args.subcategoryId)
    if (!updated) throw new Error("Sous-catégorie introuvable")
    return await enrichSubcategory(ctx, updated)
  },
})

export const clearIcon = mutation({
  args: { subcategoryId: v.id("subcategories") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const sub = await ctx.db.get(args.subcategoryId)
    if (!sub) throw new Error("Sous-catégorie introuvable")

    await deleteStorageId(ctx, sub.iconStorageId)
    await ctx.db.patch(args.subcategoryId, { iconStorageId: undefined })

    const updated = await ctx.db.get(args.subcategoryId)
    if (!updated) throw new Error("Sous-catégorie introuvable")
    return await enrichSubcategory(ctx, updated)
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

export const addTape = mutation({
  args: {
    subcategoryId: v.id("subcategories"),
    tapeId: v.id("tapes"),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const sub = await ctx.db.get(args.subcategoryId)
    if (!sub) throw new Error("Sous-catégorie introuvable")
    const tape = await ctx.db.get(args.tapeId)
    if (!tape) throw new Error("Bande introuvable")

    const playlistId = await ensurePlaylistForTape(ctx, args.tapeId, tape.title)
    const existing = await ctx.db
      .query("subcategoryItems")
      .withIndex("by_subcategory", (q) =>
        q.eq("subcategoryId", args.subcategoryId),
      )
      .collect()
    if (existing.some((i) => i.playlistId === playlistId)) {
      return
    }
    const sortOrder =
      existing.reduce((max, i) => Math.max(max, i.sortOrder), -1) + 1
    await ctx.db.insert("subcategoryItems", {
      subcategoryId: args.subcategoryId,
      playlistId,
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
