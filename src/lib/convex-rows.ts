import type { api } from "@convex/_generated/api"
import type { FunctionReturnType } from "convex/server"

export type CategoryTabRow = FunctionReturnType<
  typeof api.categoryTabs.listByCategory
>[number]

export type SubcategoryRow = FunctionReturnType<
  typeof api.subcategories.listByCategory
>[number]

export type TapeRow = FunctionReturnType<typeof api.tapes.list>[number]
