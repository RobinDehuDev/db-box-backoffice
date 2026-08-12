import type { Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

export async function deleteStorageId(
  ctx: MutationCtx,
  id: Id<"_storage"> | null | undefined,
): Promise<void> {
  if (!id) return
  await ctx.storage.delete(id)
}

export async function storageUrl(
  ctx: QueryCtx | MutationCtx,
  id: Id<"_storage"> | null | undefined,
): Promise<string | null> {
  if (!id) return null
  return await ctx.storage.getUrl(id)
}
