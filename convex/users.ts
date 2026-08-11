import { mutation, query } from "./_generated/server"
import { getAppUser, requireManager } from "./lib/auth"

/**
 * Returns whether the current user has manager/admin role in Convex.
 * Used by the UI to show the denied page without throwing.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const appUser = await getAppUser(ctx)
    if (!appUser) {
      return { signedIn: false as const, role: null, name: null, email: null }
    }
    const { identity, user, role } = appUser
    return {
      signedIn: true as const,
      role,
      name: user?.name ?? identity.name ?? null,
      email: user?.email ?? identity.email ?? null,
    }
  },
})

/**
 * Upsert a users row for the signed-in Clerk identity (no role by default).
 * Call on every admin-shell load so new sign-ins appear in Convex for approval.
 */
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Non authentifié")
    }

    const clerkUserId = identity.subject
    const email = identity.email ?? null
    const name = identity.name ?? null

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { email, name })
      return {
        userId: existing._id,
        role:
          existing.role === "manager" || existing.role === "admin"
            ? existing.role
            : null,
      }
    }

    const userId = await ctx.db.insert("users", {
      clerkUserId,
      email,
      name,
      role: null,
    })
    return { userId, role: null }
  },
})

/** List registered users (for future admin UI; also handy via `convex run`). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireManager(ctx)
    const users = await ctx.db.query("users").collect()
    return users.sort((a, b) =>
      (a.email ?? a.clerkUserId).localeCompare(b.email ?? b.clerkUserId),
    )
  },
})
