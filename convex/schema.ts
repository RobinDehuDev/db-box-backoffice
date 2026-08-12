import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { categoryKey } from "./lib/categories"

const appRole = v.union(v.literal("manager"), v.literal("admin"))

export default defineSchema({
  /**
   * Access control. Rows are created on first sign-in with no role.
   * Grant access by setting `role` to manager|admin in the Convex dashboard.
   */
  users: defineTable({
    clerkUserId: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
    name: v.optional(v.union(v.string(), v.null())),
    role: v.optional(v.union(appRole, v.null())),
  }).index("by_clerkUserId", ["clerkUserId"]),

  tapes: defineTable({
    localFileKey: v.string(),
    title: v.string(),
    durationMs: v.optional(v.union(v.number(), v.null())),
    description: v.optional(v.string()),
    authorIconStorageId: v.optional(v.id("_storage")),
  }).index("by_localFileKey", ["localFileKey"]),

  categoryTabs: defineTable({
    categoryKey,
    name: v.string(),
    sortOrder: v.number(),
  }).index("by_category", ["categoryKey", "sortOrder"]),

  cues: defineTable({
    tapeId: v.id("tapes"),
    title: v.string(),
    artist: v.optional(v.union(v.string(), v.null())),
    startMs: v.number(),
    endMs: v.optional(v.union(v.number(), v.null())),
    transitionStartMs: v.optional(v.union(v.number(), v.null())),
    transitionEndMs: v.optional(v.union(v.number(), v.null())),
    blacklisted: v.boolean(),
    sortOrder: v.number(),
  }).index("by_tape", ["tapeId", "sortOrder"]),

  playlists: defineTable({
    name: v.string(),
    description: v.string(),
    tapeId: v.optional(v.union(v.id("tapes"), v.null())),
    ready: v.boolean(),
    sortOrder: v.number(),
  }).index("by_sort", ["sortOrder"]),

  subcategories: defineTable({
    categoryKey,
    tabId: v.optional(v.id("categoryTabs")),
    name: v.string(),
    iconStorageId: v.optional(v.id("_storage")),
    sortOrder: v.number(),
  })
    .index("by_category", ["categoryKey", "sortOrder"])
    .index("by_tab", ["tabId", "sortOrder"]),

  subcategoryItems: defineTable({
    subcategoryId: v.id("subcategories"),
    playlistId: v.id("playlists"),
    sortOrder: v.number(),
  })
    .index("by_subcategory", ["subcategoryId", "sortOrder"])
    .index("by_playlist", ["playlistId"]),
})
