import type { QueryCtx, MutationCtx } from "../_generated/server"

export type AppRole = "manager" | "admin"

function roleFrom(value: unknown): AppRole | null {
  if (value === "manager" || value === "admin") return value
  return null
}

export async function getAppUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  const clerkUserId = identity.subject
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
    .unique()

  return { identity, clerkUserId, user, role: roleFrom(user?.role) }
}

/**
 * Require a signed-in Clerk user whose Convex `users` row has role manager|admin.
 * Grant access by editing the row in the Convex dashboard (Data → users → role).
 */
export async function requireManager(ctx: QueryCtx | MutationCtx) {
  const appUser = await getAppUser(ctx)
  if (!appUser) {
    throw new Error("Non authentifié")
  }
  if (!appUser.role) {
    throw new Error("Interdit : rôle manager requis")
  }
  return {
    identity: appUser.identity,
    role: appUser.role,
    user: appUser.user,
  }
}
