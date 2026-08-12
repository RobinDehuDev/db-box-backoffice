import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireManager } from "./lib/auth"
import { categoryKey } from "./lib/categories"
import { ensureDefaultTabsForCategory } from "./lib/categoryTabs"

export const ensureDefaults = mutation({
  args: { categoryKey },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    await ensureDefaultTabsForCategory(ctx, args.categoryKey)
  },
})

export const listByCategory = query({
  args: { categoryKey },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const tabs = await ctx.db
      .query("categoryTabs")
      .withIndex("by_category", (q) => q.eq("categoryKey", args.categoryKey))
      .collect()

    const withCounts = await Promise.all(
      tabs.map(async (tab) => {
        const subs = await ctx.db
          .query("subcategories")
          .withIndex("by_tab", (q) => q.eq("tabId", tab._id))
          .collect()
        return {
          ...tab,
          id: tab._id,
          subcategoryCount: subs.length,
        }
      }),
    )

    return withCounts.sort((a, b) => a.sortOrder - b.sortOrder)
  },
})

export const create = mutation({
  args: {
    categoryKey,
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    await ensureDefaultTabsForCategory(ctx, args.categoryKey)
    const existing = await ctx.db
      .query("categoryTabs")
      .withIndex("by_category", (q) => q.eq("categoryKey", args.categoryKey))
      .collect()
    const sortOrder =
      existing.reduce((max, tab) => Math.max(max, tab.sortOrder), -1) + 1
    const id = await ctx.db.insert("categoryTabs", {
      categoryKey: args.categoryKey,
      name: args.name.trim() || "Nouvel onglet",
      sortOrder,
    })
    return await ctx.db.get(id)
  },
})

export const update = mutation({
  args: {
    tabId: v.id("categoryTabs"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const tab = await ctx.db.get(args.tabId)
    if (!tab) throw new Error("Onglet introuvable")
    await ctx.db.patch(args.tabId, {
      name: args.name.trim() || tab.name,
    })
    return await ctx.db.get(args.tabId)
  },
})

export const reorder = mutation({
  args: {
    categoryKey,
    tabIds: v.array(v.id("categoryTabs")),
  },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    for (let i = 0; i < args.tabIds.length; i++) {
      const tab = await ctx.db.get(args.tabIds[i])
      if (!tab || tab.categoryKey !== args.categoryKey) {
        throw new Error("Onglet invalide pour cette catégorie")
      }
      await ctx.db.patch(args.tabIds[i], { sortOrder: i })
    }
    return await ctx.db
      .query("categoryTabs")
      .withIndex("by_category", (q) => q.eq("categoryKey", args.categoryKey))
      .collect()
  },
})

export const remove = mutation({
  args: { tabId: v.id("categoryTabs") },
  handler: async (ctx, args) => {
    await requireManager(ctx)
    const tab = await ctx.db.get(args.tabId)
    if (!tab) throw new Error("Onglet introuvable")

    const subs = await ctx.db
      .query("subcategories")
      .withIndex("by_tab", (q) => q.eq("tabId", args.tabId))
      .collect()
    if (subs.length > 0) {
      throw new Error(
        "Impossible de supprimer un onglet contenant des sous-catégories",
      )
    }

    await ctx.db.delete(args.tabId)
  },
})
