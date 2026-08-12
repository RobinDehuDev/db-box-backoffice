import type { Id } from "../_generated/dataModel"
import type { Doc } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import type { CategoryKey } from "./categories"

const DEFAULT_TAB_NAMES = ["Top chart", "Sur mesure"] as const

type LegacySubcategory = Doc<"subcategories"> & { tag?: string }

export async function ensureDefaultTabsForCategory(
  ctx: MutationCtx,
  categoryKey: CategoryKey,
): Promise<Id<"categoryTabs">[]> {
  const existing = await ctx.db
    .query("categoryTabs")
    .withIndex("by_category", (q) => q.eq("categoryKey", categoryKey))
    .collect()

  let tabIds: Id<"categoryTabs">[]

  if (existing.length === 0) {
    tabIds = []
    for (let i = 0; i < DEFAULT_TAB_NAMES.length; i++) {
      const id = await ctx.db.insert("categoryTabs", {
        categoryKey,
        name: DEFAULT_TAB_NAMES[i],
        sortOrder: i,
      })
      tabIds.push(id)
    }
  } else {
    tabIds = existing
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((tab) => tab._id)
  }

  const subs = await ctx.db
    .query("subcategories")
    .withIndex("by_category", (q) => q.eq("categoryKey", categoryKey))
    .collect()

  const topTabId = tabIds[0]
  const defaultTabId = tabIds[1] ?? tabIds[0]

  for (const sub of subs as LegacySubcategory[]) {
    if (sub.tabId) continue
    const legacyTag = sub.tag?.trim().toLowerCase() ?? ""
    const tabId = legacyTag === "top" ? topTabId : defaultTabId
    await ctx.db.patch(sub._id, { tabId })
  }

  return tabIds
}
