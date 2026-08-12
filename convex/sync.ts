import { v } from "convex/values"
import { action, internalMutation, internalQuery } from "./_generated/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { categoryKey } from "./lib/categories"
import { ensurePlaylistForTape } from "./lib/playlists"
import { deleteStorageId, storageUrl } from "./lib/storage"
import { requireSyncApiKey } from "./lib/syncAuth"

const cueImport = v.object({
  localFileKey: v.string(),
  title: v.string(),
  artist: v.optional(v.union(v.string(), v.null())),
  startMs: v.number(),
  endMs: v.optional(v.union(v.number(), v.null())),
  transitionStartMs: v.optional(v.union(v.number(), v.null())),
  transitionEndMs: v.optional(v.union(v.number(), v.null())),
  blacklisted: v.boolean(),
  sortOrder: v.number(),
})

const tabImport = v.object({
  convexId: v.optional(v.string()),
  categoryKey,
  name: v.string(),
  sortOrder: v.number(),
})

const subImport = v.object({
  convexId: v.optional(v.string()),
  categoryKey,
  tabName: v.string(),
  name: v.string(),
  sortOrder: v.number(),
  iconBase64: v.optional(v.string()),
  iconContentType: v.optional(v.string()),
})

const subImportMutation = v.object({
  convexId: v.optional(v.string()),
  categoryKey,
  tabName: v.string(),
  name: v.string(),
  sortOrder: v.number(),
  iconStorageId: v.optional(v.string()),
})

const itemImport = v.object({
  subcategoryKey: v.object({
    categoryKey,
    tabName: v.string(),
    name: v.string(),
  }),
  localFileKey: v.string(),
  sortOrder: v.number(),
})

const tapeImport = v.object({
  convexId: v.optional(v.string()),
  localFileKey: v.string(),
  title: v.string(),
  durationMs: v.optional(v.union(v.number(), v.null())),
  description: v.optional(v.string()),
  authorIconBase64: v.optional(v.string()),
  authorIconContentType: v.optional(v.string()),
})

const tapeImportMutation = v.object({
  convexId: v.optional(v.string()),
  localFileKey: v.string(),
  title: v.string(),
  durationMs: v.optional(v.union(v.number(), v.null())),
  description: v.optional(v.string()),
  authorIconStorageId: v.optional(v.string()),
})

const playlistImport = v.object({
  convexId: v.optional(v.string()),
  localFileKey: v.string(),
  name: v.string(),
  description: v.string(),
  ready: v.boolean(),
  sortOrder: v.number(),
})

type ImportSnapshotCounts = {
  tabsUpserted: number
  subsUpserted: number
  tapesUpserted: number
  cuesUpserted: number
  playlistsUpserted: number
  itemsUpserted: number
}

export type ExportSnapshotResult = {
  categoryTabs: Array<{
    convexId: string
    categoryKey: string
    name: string
    sortOrder: number
  }>
  subcategories: Array<{
    convexId: string
    categoryKey: string
    tabConvexId: string | null
    tabName: string
    name: string
    sortOrder: number
    iconUrl: string | null
  }>
  subcategoryItems: Array<{
    subcategoryConvexId: string
    subcategoryKey: {
      categoryKey: string
      tabName: string
      name: string
    } | null
    playlistConvexId: string
    localFileKey: string | null
    sortOrder: number
  }>
  playlists: Array<{
    convexId: string
    localFileKey: string
    name: string
    description: string
    ready: boolean
    sortOrder: number
  }>
  tapes: Array<{
    convexId: string
    localFileKey: string
    title: string
    durationMs: number | null
    description: string
    authorIconUrl: string | null
  }>
  cues: Array<{
    localFileKey: string
    title: string
    artist: string | null
    startMs: number
    endMs: number | null
    transitionStartMs: number | null
    transitionEndMs: number | null
    blacklisted: boolean
    sortOrder: number
  }>
}

export const exportSnapshot = action({
  args: { apiKey: v.string() },
  handler: async (ctx, args): Promise<ExportSnapshotResult> => {
    requireSyncApiKey(args.apiKey)
    return await ctx.runQuery(internal.sync.exportSnapshotData, {})
  },
})

export const importSnapshot = action({
  args: {
    apiKey: v.string(),
    categoryTabs: v.array(tabImport),
    subcategories: v.array(subImport),
    subcategoryItems: v.array(itemImport),
    tapes: v.array(tapeImport),
    cues: v.array(cueImport),
    playlists: v.array(playlistImport),
  },
  handler: async (ctx, args): Promise<ImportSnapshotCounts> => {
    requireSyncApiKey(args.apiKey)

    const subcategories = await Promise.all(
      args.subcategories.map(async (sub) => {
        const { iconBase64, iconContentType, ...rest } = sub
        let iconStorageId: string | undefined
        if (iconBase64 && iconContentType) {
          const bytes = decodeBase64(iconBase64)
          const blob = new Blob([toArrayBuffer(bytes)], {
            type: iconContentType,
          })
          iconStorageId = await ctx.storage.store(blob)
        }
        return { ...rest, iconStorageId }
      }),
    )

    const tapes = await Promise.all(
      args.tapes.map(async (tape) => {
        const { authorIconBase64, authorIconContentType, ...rest } = tape
        let authorIconStorageId: string | undefined
        if (authorIconBase64 && authorIconContentType) {
          const bytes = decodeBase64(authorIconBase64)
          const blob = new Blob([toArrayBuffer(bytes)], {
            type: authorIconContentType,
          })
          authorIconStorageId = await ctx.storage.store(blob)
        }
        return { ...rest, authorIconStorageId }
      }),
    )

    return await ctx.runMutation(internal.sync.importSnapshotData, {
      categoryTabs: args.categoryTabs,
      subcategories,
      subcategoryItems: args.subcategoryItems,
      tapes,
      cues: args.cues,
      playlists: args.playlists,
    })
  },
})

export const exportSnapshotData = internalQuery({
  args: {},
  handler: async (ctx): Promise<ExportSnapshotResult> => {
    const allTabs = await ctx.db.query("categoryTabs").collect()
    const allSubs = await ctx.db.query("subcategories").collect()
    const allItems = await ctx.db.query("subcategoryItems").collect()
    const allPlaylists = await ctx.db.query("playlists").collect()
    const allTapes = await ctx.db.query("tapes").collect()
    const allCues = await ctx.db.query("cues").collect()

    const tabById = new Map(allTabs.map((t) => [t._id, t]))
    const tapeById = new Map(allTapes.map((t) => [t._id, t]))
    const playlistById = new Map(allPlaylists.map((p) => [p._id, p]))

    const categoryTabs = await Promise.all(
      allTabs
        .sort((a, b) =>
          a.categoryKey === b.categoryKey
            ? a.sortOrder - b.sortOrder
            : a.categoryKey.localeCompare(b.categoryKey),
        )
        .map(async (tab) => ({
          convexId: tab._id,
          categoryKey: tab.categoryKey,
          name: tab.name,
          sortOrder: tab.sortOrder,
        })),
    )

    const subcategories = await Promise.all(
      allSubs
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(async (sub) => {
          const tab = sub.tabId ? tabById.get(sub.tabId) : null
          return {
            convexId: sub._id,
            categoryKey: sub.categoryKey,
            tabConvexId: sub.tabId ?? null,
            tabName: tab?.name ?? "",
            name: sub.name,
            sortOrder: sub.sortOrder,
            iconUrl: await storageUrl(ctx, sub.iconStorageId),
          }
        }),
    )

    const subcategoryItems = allItems
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => {
        const sub = allSubs.find((s) => s._id === item.subcategoryId)
        const tab = sub?.tabId ? tabById.get(sub.tabId) : null
        const pl = playlistById.get(item.playlistId)
        const tape = pl?.tapeId ? tapeById.get(pl.tapeId) : null
        return {
          subcategoryConvexId: item.subcategoryId,
          subcategoryKey: sub
            ? {
                categoryKey: sub.categoryKey,
                tabName: tab?.name ?? "",
                name: sub.name,
              }
            : null,
          playlistConvexId: item.playlistId,
          localFileKey: tape?.localFileKey ?? null,
          sortOrder: item.sortOrder,
        }
      })
      .filter((i) => i.subcategoryKey && i.localFileKey)

    const playlists = allPlaylists
      .filter((p) => p.tapeId != null)
      .map((p) => {
        const tape = p.tapeId ? tapeById.get(p.tapeId) : null
        return {
          convexId: p._id,
          localFileKey: tape?.localFileKey ?? "",
          name: p.name,
          description: p.description,
          ready: p.ready,
          sortOrder: p.sortOrder,
        }
      })
      .filter((p) => p.localFileKey)

    const tapes = await Promise.all(
      allTapes.map(async (tape) => ({
        convexId: tape._id,
        localFileKey: tape.localFileKey,
        title: tape.title,
        durationMs: tape.durationMs ?? null,
        description: tape.description ?? "",
        authorIconUrl: await storageUrl(ctx, tape.authorIconStorageId),
      })),
    )

    const cues = allCues
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((cue) => {
        const tape = tapeById.get(cue.tapeId)
        return {
          localFileKey: tape?.localFileKey ?? "",
          title: cue.title,
          artist: cue.artist ?? null,
          startMs: cue.startMs,
          endMs: cue.endMs ?? null,
          transitionStartMs: cue.transitionStartMs ?? null,
          transitionEndMs: cue.transitionEndMs ?? null,
          blacklisted: cue.blacklisted,
          sortOrder: cue.sortOrder,
        }
      })
      .filter((c) => c.localFileKey)

    return {
      categoryTabs,
      subcategories,
      subcategoryItems,
      playlists,
      tapes,
      cues,
    }
  },
})

function decodeBase64(data: string): Uint8Array {
  return Uint8Array.from(Buffer.from(data, "base64"))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
}

export const importSnapshotData = internalMutation({
  args: {
    categoryTabs: v.array(tabImport),
    subcategories: v.array(subImportMutation),
    subcategoryItems: v.array(itemImport),
    tapes: v.array(tapeImportMutation),
    cues: v.array(cueImport),
    playlists: v.array(playlistImport),
  },
  handler: async (ctx, args): Promise<ImportSnapshotCounts> => {
    let tabsUpserted = 0
    let subsUpserted = 0
    let tapesUpserted = 0
    let cuesUpserted = 0
    let itemsUpserted = 0
    let playlistsUpserted = 0

    const tabIdByKey = new Map<string, Id<"categoryTabs">>()

    for (const tab of args.categoryTabs) {
      let existing = tab.convexId
        ? await ctx.db.get(tab.convexId as Id<"categoryTabs">)
        : null
      if (!existing) {
        const inCat = await ctx.db
          .query("categoryTabs")
          .withIndex("by_category", (q) => q.eq("categoryKey", tab.categoryKey))
          .collect()
        existing =
          inCat.find((t) => t.name === tab.name.trim()) ?? null
      }
      if (existing) {
        await ctx.db.patch(existing._id, {
          name: tab.name.trim(),
          sortOrder: tab.sortOrder,
        })
        tabIdByKey.set(`${tab.categoryKey}\0${tab.name.trim()}`, existing._id)
        tabsUpserted++
      } else {
        const id = await ctx.db.insert("categoryTabs", {
          categoryKey: tab.categoryKey,
          name: tab.name.trim(),
          sortOrder: tab.sortOrder,
        })
        tabIdByKey.set(`${tab.categoryKey}\0${tab.name.trim()}`, id)
        tabsUpserted++
      }
    }

    const subIdByKey = new Map<string, Id<"subcategories">>()

    for (const sub of args.subcategories) {
      const tabId = tabIdByKey.get(
        `${sub.categoryKey}\0${sub.tabName.trim()}`,
      )
      if (!tabId) continue

      let existing = sub.convexId
        ? await ctx.db.get(sub.convexId as Id<"subcategories">)
        : null
      if (!existing) {
        const inCat = await ctx.db
          .query("subcategories")
          .withIndex("by_category", (q) =>
            q.eq("categoryKey", sub.categoryKey),
          )
          .collect()
        existing =
          inCat.find(
            (s) => s.name === sub.name.trim() && s.tabId === tabId,
          ) ?? null
      }

      let iconStorageId: Id<"_storage"> | undefined = existing?.iconStorageId
      if (sub.iconStorageId) {
        if (existing?.iconStorageId && existing.iconStorageId !== sub.iconStorageId) {
          await deleteStorageId(ctx, existing.iconStorageId)
        }
        iconStorageId = sub.iconStorageId as Id<"_storage">
      }

      if (existing) {
        await ctx.db.patch(existing._id, {
          tabId,
          name: sub.name.trim(),
          sortOrder: sub.sortOrder,
          ...(iconStorageId !== undefined ? { iconStorageId } : {}),
        })
        subIdByKey.set(
          `${sub.categoryKey}\0${sub.tabName.trim()}\0${sub.name.trim()}`,
          existing._id,
        )
        subsUpserted++
      } else {
        const id = await ctx.db.insert("subcategories", {
          categoryKey: sub.categoryKey,
          tabId,
          name: sub.name.trim(),
          sortOrder: sub.sortOrder,
          iconStorageId,
        })
        subIdByKey.set(
          `${sub.categoryKey}\0${sub.tabName.trim()}\0${sub.name.trim()}`,
          id,
        )
        subsUpserted++
      }
    }

    const tapeIdByKey = new Map<string, Id<"tapes">>()

    for (const tape of args.tapes) {
      const key = tape.localFileKey.trim()
      if (!key) continue

      let existing = await ctx.db
        .query("tapes")
        .withIndex("by_localFileKey", (q) => q.eq("localFileKey", key))
        .unique()

      let authorIconStorageId: Id<"_storage"> | undefined =
        existing?.authorIconStorageId
      if (tape.authorIconStorageId) {
        if (
          existing?.authorIconStorageId &&
          existing.authorIconStorageId !== tape.authorIconStorageId
        ) {
          await deleteStorageId(ctx, existing.authorIconStorageId)
        }
        authorIconStorageId = tape.authorIconStorageId as Id<"_storage">
      }

      if (existing) {
        await ctx.db.patch(existing._id, {
          title: tape.title.trim() || key,
          durationMs: tape.durationMs ?? null,
          description: tape.description?.trim() ?? "",
          ...(authorIconStorageId !== undefined
            ? { authorIconStorageId }
            : {}),
        })
        tapeIdByKey.set(key, existing._id)
        tapesUpserted++
      } else {
        const id = await ctx.db.insert("tapes", {
          localFileKey: key,
          title: tape.title.trim() || key,
          durationMs: tape.durationMs ?? null,
          description: tape.description?.trim() ?? "",
          authorIconStorageId,
        })
        tapeIdByKey.set(key, id)
        tapesUpserted++
      }
    }

    for (const cue of args.cues) {
      const key = cue.localFileKey.trim()
      const tapeId = tapeIdByKey.get(key)
      if (!tapeId) continue

      const existing = await ctx.db
        .query("cues")
        .withIndex("by_tape", (q) => q.eq("tapeId", tapeId))
        .collect()
      const match = existing.find((c) => c.sortOrder === cue.sortOrder)

      if (match) {
        await ctx.db.patch(match._id, {
          title: cue.title.trim(),
          artist: cue.artist?.trim() || null,
          startMs: Math.round(cue.startMs),
          endMs: cue.endMs ?? null,
          transitionStartMs: cue.transitionStartMs ?? null,
          transitionEndMs: cue.transitionEndMs ?? null,
          blacklisted: cue.blacklisted,
          sortOrder: cue.sortOrder,
        })
      } else {
        await ctx.db.insert("cues", {
          tapeId,
          title: cue.title.trim(),
          artist: cue.artist?.trim() || null,
          startMs: Math.round(cue.startMs),
          endMs: cue.endMs ?? null,
          transitionStartMs: cue.transitionStartMs ?? null,
          transitionEndMs: cue.transitionEndMs ?? null,
          blacklisted: cue.blacklisted,
          sortOrder: cue.sortOrder,
        })
      }
      cuesUpserted++
    }

    const playlistIdByKey = new Map<string, Id<"playlists">>()

    for (const pl of args.playlists) {
      const key = pl.localFileKey.trim()
      const tapeId = tapeIdByKey.get(key)
      if (!tapeId) continue

      const playlistId = await ensurePlaylistForTape(
        ctx,
        tapeId,
        pl.name.trim() || key,
      )
      await ctx.db.patch(playlistId, {
        name: pl.name.trim(),
        description: pl.description,
        ready: pl.ready,
        sortOrder: pl.sortOrder,
      })
      playlistIdByKey.set(key, playlistId)
      playlistsUpserted++
    }

    for (const item of args.subcategoryItems) {
      const subKey = `${item.subcategoryKey.categoryKey}\0${item.subcategoryKey.tabName.trim()}\0${item.subcategoryKey.name.trim()}`
      const subId = subIdByKey.get(subKey)
      const playlistId = playlistIdByKey.get(item.localFileKey.trim())
      if (!subId || !playlistId) continue

      const existing = await ctx.db
        .query("subcategoryItems")
        .withIndex("by_subcategory", (q) => q.eq("subcategoryId", subId))
        .collect()
      const match = existing.find((i) => i.playlistId === playlistId)

      if (match) {
        await ctx.db.patch(match._id, { sortOrder: item.sortOrder })
      } else {
        await ctx.db.insert("subcategoryItems", {
          subcategoryId: subId,
          playlistId,
          sortOrder: item.sortOrder,
        })
      }
      itemsUpserted++
    }

    return {
      tabsUpserted,
      subsUpserted,
      tapesUpserted,
      cuesUpserted,
      playlistsUpserted,
      itemsUpserted,
    }
  },
})
