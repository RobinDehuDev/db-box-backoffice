import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const categoryKey = v.union(
  v.literal("tempsForts"),
  v.literal("danceFloor"),
  v.literal("cocktail"),
  v.literal("karaoke"),
  v.literal("blindTest"),
  v.literal("burgerQuiz"),
)

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
  }).index("by_localFileKey", ["localFileKey"]),

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
    name: v.string(),
    tag: v.string(),
    sortOrder: v.number(),
  }).index("by_category", ["categoryKey", "sortOrder"]),

  subcategoryItems: defineTable({
    subcategoryId: v.id("subcategories"),
    playlistId: v.id("playlists"),
    sortOrder: v.number(),
  })
    .index("by_subcategory", ["subcategoryId", "sortOrder"])
    .index("by_playlist", ["playlistId"]),
})
